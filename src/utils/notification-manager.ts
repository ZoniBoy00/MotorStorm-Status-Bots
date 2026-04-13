import type { TextChannel } from "discord.js"
import { Logger } from "./logger"
import type { Lobby } from "../types"
import { Database } from "./database"

interface LobbySnapshot {
  name: string
  players: string[]
  timestamp: number
}

interface NotificationConfig {
  channelId: string
  roleId: string
  enabled: boolean
  pingsEnabled: boolean
}

/**
 * Manages lobby notifications and tracks new lobbies using MySQL
 */
export class NotificationManager {
  private logger: Logger
  private previousLobbies: Map<string, LobbySnapshot>
  private notificationConfig?: NotificationConfig
  private readonly COOLDOWN_MS = 120000 // 2 minutes cooldown for same lobby
  private botName: string
  private hasLoggedInitStatus = false

  constructor(botName: string, notificationChannelId?: string, notificationRoleId?: string, pingsEnabled = false) {
    this.botName = botName
    this.logger = new Logger(`${botName}-Notify`)
    this.previousLobbies = new Map()

    // Force pings to false unless explicitly enabled AND roleId exists
    const finalPingsEnabled = pingsEnabled && !!notificationRoleId

    if (notificationChannelId) {
      this.notificationConfig = {
        channelId: notificationChannelId,
        roleId: notificationRoleId || '',
        enabled: true,
        pingsEnabled: finalPingsEnabled,
      }
      if (notificationRoleId) {
        if (finalPingsEnabled) {
          this.logger.info(`🔔 Notifications ENABLED (Channel: ${notificationChannelId}, Role: ${notificationRoleId}, PINGS: ON)`)
        } else {
          this.logger.info(`🔔 Notifications ENABLED (Channel: ${notificationChannelId}, Role: ${notificationRoleId}, PINGS: OFF)`)
        }
      } else {
        this.logger.info(`🔔 Notifications ENABLED (Channel: ${notificationChannelId}, no role)`)
      }
    } else {
      this.logger.info(`🔔 Notifications DISABLED`)
    }
  }

  /**
   * Initialize and load previous lobby state
   */
  public async initialize(): Promise<void> {
    await this.loadPreviousLobbies();
  }

  /**
   * Load previous lobby state from MySQL
   */
  private async loadPreviousLobbies(): Promise<void> {
    try {
      const results: any[] = await Database.query(
        'SELECT lobby_name, players, timestamp FROM bot_notifications_history WHERE bot_name = ?',
        [this.botName]
      )

      for (const row of results) {
        this.previousLobbies.set(row.lobby_name, {
          name: row.lobby_name,
          players: JSON.parse(row.players || '[]'),
          timestamp: Number(row.timestamp)
        })
      }

      if (results.length > 0) {
        this.logger.info(`Loaded ${results.length} lobby states from MySQL`)
      }
    } catch (error) {
      this.logger.error(`Failed to load lobby history from MySQL: ${error}`)
    }
  }

  /**
   * Save lobby state to MySQL
   */
  private async saveLobbyState(lobbyName: string, snapshot: LobbySnapshot): Promise<void> {
    try {
      await Database.query(
        'INSERT INTO bot_notifications_history (bot_name, lobby_name, players, timestamp) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE players = ?, timestamp = ?',
        [
          this.botName,
          lobbyName,
          JSON.stringify(snapshot.players),
          snapshot.timestamp,
          JSON.stringify(snapshot.players),
          snapshot.timestamp
        ]
      )
    } catch (error) {
      this.logger.error(`Failed to save lobby state to MySQL: ${error}`)
    }
  }

  /**
   * Check for new lobbies and send notifications
   */
  public async checkForNewLobbies(lobbies: Lobby[], notificationChannel?: TextChannel): Promise<void> {
    if (!this.hasLoggedInitStatus) {
      this.hasLoggedInitStatus = true
      if (this.notificationConfig?.enabled) {
        this.logger.info(`Monitoring for new lobbies...`)
      }
    }

    if (!this.notificationConfig?.enabled) {
      return
    }

    if (!notificationChannel) {
      this.logger.warning(`⚠️ Notification channel ${this.notificationConfig.channelId} not accessible`)
      return
    }

    const currentTime = Date.now()
    const newLobbies: Lobby[] = []

    for (const lobby of lobbies) {
      // Only notify for active game lobbies with players
      if (!lobby.is_active || lobby.player_count === 0 || lobby.name === "Main Menu") {
        continue
      }

      const previousLobby = this.previousLobbies.get(lobby.name)

      // Check if this is a new lobby or if it was empty before
      if (!previousLobby) {
        this.logger.info(`✨ NEW lobby: "${lobby.name}" (${lobby.player_count} players)`)
        newLobbies.push(lobby)
      } else if (
        previousLobby.players.length === 0 &&
        lobby.players.length > 0 &&
        currentTime - previousLobby.timestamp > this.COOLDOWN_MS
      ) {
        // Lobby was empty but now has players (after cooldown)
        this.logger.info(`🔄 Lobby reopened: "${lobby.name}" (${lobby.player_count} players)`)
        newLobbies.push(lobby)
      }
    }

    // Update the lobby snapshots and save to DB
    for (const lobby of lobbies) {
      const snapshot: LobbySnapshot = {
        name: lobby.name,
        players: [...lobby.players],
        timestamp: currentTime,
      }
      this.previousLobbies.set(lobby.name, snapshot)
      await this.saveLobbyState(lobby.name, snapshot)
    }

    // Send notifications for new lobbies
    if (newLobbies.length > 0) {
      for (const lobby of newLobbies) {
        await this.sendLobbyNotification(lobby, notificationChannel)
      }
    }
  }

  /**
   * Send a notification for a new lobby
   */
  private async sendLobbyNotification(lobby: Lobby, channel: TextChannel): Promise<void> {
    try {
      const roleId = this.notificationConfig!.roleId;
      const pingsEnabled = this.notificationConfig!.pingsEnabled;
      const shouldPing = pingsEnabled && roleId;

      this.logger.info(`[Notification Debug] roleId: "${roleId}", pingsEnabled: ${pingsEnabled}, shouldPing: ${!!shouldPing}`)

      let roleMention = '';
      
      if (roleId) {
        if (shouldPing) {
          roleMention = `<@&${roleId}> `;
        } else {
          // Try to get role name from cache first, then fetch if needed
          let roleName = channel.guild.roles.cache.get(roleId)?.name;
          
          if (!roleName) {
            try {
              const fetchedRole = await channel.guild.roles.fetch(roleId);
              roleName = fetchedRole?.name || "Racers";
            } catch {
              roleName = "Racers";
            }
          }
          
          roleMention = `@${roleName} `;
        }
      }

      const playerList = lobby.players.map((p) => `\`${p}\``).join(", ");
      const playerCount = `**${lobby.player_count}/${lobby.max_players}**`;

      let message = `${roleMention}New lobby: **${lobby.name}**\nPlayers: ${playerList}\n${playerCount} slots`;

      // Add config details if available
      if (lobby.config) {
        const details: string[] = []
        if (lobby.config.gameMode) details.push(lobby.config.gameMode)
        if (lobby.config.track) details.push(lobby.config.track)
        if (lobby.config.lapCount) details.push(`${lobby.config.lapCount} laps`)
        if (lobby.config.direction) details.push(lobby.config.direction)

        if (details.length > 0) {
          message += "\n" + details.join(" • ")
        }
      }

      await channel.send(message)

      const didPing = shouldPing && roleId ? "with" : "without";
      this.logger.success(
        `Sent notification for "${lobby.name}" ${didPing} ping`,
      )
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error}`)
    }
  }

  /**
   * Clear all lobby history
   */
  public async clearHistory(): Promise<void> {
    try {
      this.previousLobbies.clear()
      await Database.query('DELETE FROM bot_notifications_history WHERE bot_name = ?', [this.botName])
      this.logger.info("Lobby history cleared from MySQL")
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error}`)
    }
  }
}
