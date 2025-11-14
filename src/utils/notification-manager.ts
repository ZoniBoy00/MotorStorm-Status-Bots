import { TextChannel } from 'discord.js';
import { Logger } from './logger';
import { Lobby } from '../types';
import * as fs from 'fs';
import * as path from 'path';

interface LobbySnapshot {
  name: string;
  players: string[];
  timestamp: number;
}

interface NotificationConfig {
  channelId: string;
  roleId: string;
  enabled: boolean;
}

/**
 * Manages lobby notifications and tracks new lobbies
 */
export class NotificationManager {
  private logger: Logger;
  private previousLobbies: Map<string, LobbySnapshot>;
  private storePath: string;
  private notificationConfig?: NotificationConfig;
  private readonly COOLDOWN_MS = 120000; // 2 minutes cooldown for same lobby
  private fileSystemAvailable: boolean = true;
  private hasLoggedInitStatus: boolean = false;

  constructor(botName: string, notificationChannelId?: string, notificationRoleId?: string) {
    this.logger = new Logger(botName);
    this.previousLobbies = new Map();
    
    const dataDir = process.env.PTERODACTYL_CONTAINER 
      ? '/tmp/motorstorm-data'
      : path.join(process.cwd(), 'data');
    
    this.storePath = path.join(dataDir, `${botName.toLowerCase()}-lobbies.json`);

    if (notificationChannelId && notificationRoleId) {
      this.notificationConfig = {
        channelId: notificationChannelId,
        roleId: notificationRoleId,
        enabled: true,
      };
      console.log(`\x1b[32m[${botName}] 🔔 Lobby notifications ENABLED\x1b[0m`);
      console.log(`\x1b[36m[${botName}]    └─ Channel: ${notificationChannelId}\x1b[0m`);
      console.log(`\x1b[36m[${botName}]    └─ Role: ${notificationRoleId}\x1b[0m`);
    } else {
      console.log(`\x1b[33m[${botName}] 🔔 Lobby notifications DISABLED\x1b[0m`);
      if (!notificationChannelId) {
        console.log(`\x1b[33m[${botName}]    └─ Missing: NOTIFICATION_CHANNEL\x1b[0m`);
      }
      if (!notificationRoleId) {
        console.log(`\x1b[33m[${botName}]    └─ Missing: NOTIFICATION_ROLE\x1b[0m`);
      }
    }

    this.loadPreviousLobbies();
  }

  /**
   * Load previous lobby state from disk
   */
  private loadPreviousLobbies(): void {
    try {
      const dataDir = path.dirname(this.storePath);
      
      this.logger.info(`Data directory: ${dataDir}`);
      this.logger.info(`Store path: ${this.storePath}`);
      
      if (!fs.existsSync(dataDir)) {
        this.logger.info('Creating data directory...');
        fs.mkdirSync(dataDir, { recursive: true });
        this.logger.success('Data directory created');
      }

      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.previousLobbies = new Map(Object.entries(parsed));
        this.logger.info(`Loaded ${this.previousLobbies.size} previous lobbies from disk`);
      } else {
        this.logger.info('No previous lobby data found (first run)');
      }
      
      // Test write permissions
      this.savePreviousLobbies();
      this.logger.success('File system is writable');
    } catch (error) {
      this.fileSystemAvailable = false;
      this.logger.warning(`File system not available: ${error}. Notifications will work but history won't persist.`);
    }
  }

  /**
   * Save lobby state to disk
   */
  private savePreviousLobbies(): void {
    if (!this.fileSystemAvailable) {
      return;
    }
    
    try {
      const data = Object.fromEntries(this.previousLobbies);
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.fileSystemAvailable = false;
      this.logger.error(`Failed to save lobby state: ${error}`);
    }
  }

  /**
   * Check for new lobbies and send notifications
   */
  public async checkForNewLobbies(
    lobbies: Lobby[],
    notificationChannel?: TextChannel
  ): Promise<void> {
    if (!this.hasLoggedInitStatus) {
      this.hasLoggedInitStatus = true;
      if (this.notificationConfig?.enabled) {
        this.logger.info(`🔔 Notification system active, monitoring for new lobbies...`);
      }
    }

    if (!this.notificationConfig?.enabled) {
      return;
    }

    if (!notificationChannel) {
      this.logger.warning(`⚠️ Notification channel ${this.notificationConfig.channelId} not accessible`);
      return;
    }

    const currentTime = Date.now();
    const newLobbies: Lobby[] = [];

    if (lobbies.length > 0) {
      this.logger.info(`🔍 Checking ${lobbies.length} lobby/lobbies for notifications...`);
    }

    for (const lobby of lobbies) {
      // Only notify for active game lobbies with players
      if (!lobby.is_active || lobby.player_count === 0 || lobby.name === 'Main Menu') {
        continue;
      }

      const previousLobby = this.previousLobbies.get(lobby.name);

      // Check if this is a new lobby or if it was empty before
      if (!previousLobby) {
        this.logger.info(`✨ NEW lobby detected: "${lobby.name}" (${lobby.player_count} players)`);
        newLobbies.push(lobby);
      } else if (
        previousLobby.players.length === 0 &&
        lobby.players.length > 0 &&
        currentTime - previousLobby.timestamp > this.COOLDOWN_MS
      ) {
        // Lobby was empty but now has players (after cooldown)
        this.logger.info(`🔄 Lobby reopened: "${lobby.name}" (${lobby.player_count} players)`);
        newLobbies.push(lobby);
      }
    }

    // Update the lobby snapshots
    for (const lobby of lobbies) {
      this.previousLobbies.set(lobby.name, {
        name: lobby.name,
        players: [...lobby.players],
        timestamp: currentTime,
      });
    }

    this.savePreviousLobbies();

    // Send notifications for new lobbies
    if (newLobbies.length > 0) {
      for (const lobby of newLobbies) {
        await this.sendLobbyNotification(lobby, notificationChannel);
      }
    }
  }

  /**
   * Send a fun notification for a new lobby
   */
  private async sendLobbyNotification(lobby: Lobby, channel: TextChannel): Promise<void> {
    try {
      const roleId = this.notificationConfig!.roleId;
      const roleMention = `<@&${roleId}>`;

      const playerList = lobby.players.map((p) => `\`${p}\``).join(', ');
      const playerCount = `**${lobby.player_count}/${lobby.max_players}**`;

      // Random fun announcement templates
      const announcements = [
        `🏁 **REV YOUR ENGINES!** ${roleMention}\n${playerList} just opened a lobby: **${lobby.name}**\n💨 ${playerCount} racers ready • Join now before the track gets full!`,
        
        `⚡ **LOBBY ALERT!** ${roleMention}\n🎮 **${lobby.name}** is now LIVE!\n👥 Hosted by ${playerList}\n🏆 ${playerCount} slots • Time to show your skills!`,
        
        `🔥 **GET IN HERE!** ${roleMention}\nThe engines are roaring! ${playerList} started **${lobby.name}**\n🎯 ${playerCount} players • Don't miss the action!`,
        
        `💨 **VROOM VROOM!** ${roleMention}\n${playerList} is calling all racers to **${lobby.name}**!\n⚡ ${playerCount} ready to race • Pedal to the metal!`,
        
        `🎮 **GAME ON!** ${roleMention}\nFresh lobby just dropped: **${lobby.name}**\n👤 Started by ${playerList} • ${playerCount} racers • Let's go!`,
        
        `🏆 **CHALLENGE MODE ACTIVATED!** ${roleMention}\n${playerList} dares you to join **${lobby.name}**\n🔥 ${playerCount} warriors ready • Can you keep up?`,
        
        `🚗 **BUCKLE UP, BUTTERCUP!** ${roleMention}\n**${lobby.name}** is heating up with ${playerList}\n💪 ${playerCount} slots available • Show them what you've got!`,
        
        `⭐ **IT'S GO TIME!** ${roleMention}\nThe track is calling! ${playerList} opened **${lobby.name}**\n🎯 ${playerCount} racers • First come, first served!`,
        
        `🎪 **THE PARTY'S STARTING!** ${roleMention}\n${playerList} just lit up **${lobby.name}**\n🌟 ${playerCount} players ready • Join the chaos!`,
        
        `🔊 **ATTENTION ALL DRIVERS!** ${roleMention}\nNew race alert: **${lobby.name}** by ${playerList}\n⚡ ${playerCount} on the grid • Your seat is waiting!`,
        
        `🎯 **OPPORTUNITY KNOCKING!** ${roleMention}\n${playerList} needs competition in **${lobby.name}**\n💥 ${playerCount} racers • Are you brave enough?`,
        
        `🌟 **RALLY CRY!** ${roleMention}\nThe mud's flying and the engines are screaming!\n${playerList} started **${lobby.name}** • ${playerCount} ready to rumble!`,
      ];

      // Add config details if available
      let configText = '';
      if (lobby.config) {
        const details: string[] = [];
        if (lobby.config.gameMode) details.push(`🎮 ${lobby.config.gameMode}`);
        if (lobby.config.track) details.push(`🗺️ ${lobby.config.track}`);
        if (lobby.config.lapCount) details.push(`🔄 ${lobby.config.lapCount} laps`);
        if (lobby.config.direction) details.push(`↔️ ${lobby.config.direction}`);
        
        if (details.length > 0) {
          configText = '\n📋 ' + details.join(' • ');
        }
      }

      const randomAnnouncement = announcements[Math.floor(Math.random() * announcements.length)];
      const finalMessage = randomAnnouncement + configText;

      await channel.send(finalMessage);

      this.logger.success(`Notification sent for "${lobby.name}"`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Clear all lobby history (useful for testing)
   */
  public clearHistory(): void {
    this.previousLobbies.clear();
    this.savePreviousLobbies();
    this.logger.info('Lobby history cleared');
  }
}
