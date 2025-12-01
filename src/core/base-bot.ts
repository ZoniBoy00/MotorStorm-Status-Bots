import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, ChannelType, Events } from 'discord.js';
import { BotConfig, ActivityConfig, ServerData } from '../types';
import { Logger, MessageManager, NotificationManager } from '../utils';

/**
 * Abstract base class for all MotorStorm bots with multi-channel support
 */
export abstract class BaseBot {
  protected client: Client;
  protected config: BotConfig;
  protected logger: Logger;
  protected messageManager: MessageManager;
  protected notificationManager: NotificationManager;
  protected activities: ActivityConfig[];
  protected activityIndex: number = 0;
  protected totalPlayers: number = 0;
  private statusCheckTimer?: NodeJS.Timeout;
  private activityRotationTimer?: NodeJS.Timeout;
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;

  constructor(config: BotConfig, botName: string) {
    this.config = config;
    this.logger = new Logger(botName);
    this.messageManager = new MessageManager(botName);
    
    this.notificationManager = new NotificationManager(
      botName,
      config.notificationChannelId,
      config.notificationRoleId,
      config.notificationPingsEnabled ?? true
    );

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.activities = this.getActivities();
    
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    
    this.setupEventHandlers();
  }

  /**
   * Get bot-specific activities - to be implemented by each bot
   */
  protected abstract getActivities(): ActivityConfig[];

  /**
   * Fetch server data - to be implemented by each bot
   */
  protected abstract fetchServerData(): Promise<ServerData | null>;

  /**
   * Format embed - to be implemented by each bot
   */
  protected abstract formatEmbed(data: ServerData): EmbedBuilder;

  /**
   * Get total players from data - to be implemented by each bot
   */
  protected abstract getTotalPlayers(data: ServerData): number;

  /**
   * Get lobbies from server data - to be implemented by each bot
   */
  protected abstract getLobbies(data: ServerData): any[];

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, () => this.onReady());
    this.client.on(Events.Error, (error) => this.logger.error('Client error:', error));
  }

  /**
   * Handle bot ready event
   */
  private async onReady(): Promise<void> {
    if (!this.client.user) return;

    this.logger.success(`Bot logged in as ${this.client.user.tag}`);
    this.logger.info(`Monitoring ${this.config.channelIds.length} channel(s)`);

    if (this.config.debug) {
      const channels = this.client.channels.cache
        .map((ch) => `${ch.id} - ${(ch as any).name || 'Unnamed'}`)
        .join(', ');
      this.logger.info(`Available channels: ${channels}`);
    }

    // Initialize message manager
    await this.messageManager.initialize();

    await this.checkServerStatus();

    // Start intervals
    this.startStatusChecks();
    this.startActivityRotation();
    
    if (this.readyResolve) {
      this.readyResolve();
    }
  }

  /**
   * Start status check interval
   */
  private startStatusChecks(): void {
    this.statusCheckTimer = setInterval(
      () => this.checkServerStatus(),
      this.config.statusCheckInterval
    );
  }

  /**
   * Start activity rotation interval
   */
  private startActivityRotation(): void {
    // Update immediately
    this.updateBotActivity();

    // Then update on interval
    this.activityRotationTimer = setInterval(
      () => this.updateBotActivity(),
      this.config.activityRotationInterval
    );
  }

  /**
   * Update bot activity status
   */
  private updateBotActivity(): void {
    if (!this.client.user) return;

    const activity = this.activities[this.activityIndex];
    let activityMessage = activity.message;

    // Replace placeholder with actual player count
    if (activityMessage.includes('{totalPlayers}')) {
      activityMessage = activityMessage.replace('{totalPlayers}', String(this.totalPlayers));
    }

    this.client.user.setActivity({
      name: activityMessage,
      type: activity.type,
    });

    // Rotate to next activity
    this.activityIndex = (this.activityIndex + 1) % this.activities.length;
  }

  /**
   * Check server status and update all channels
   */
  private async checkServerStatus(): Promise<void> {
    try {
      this.logger.info('Fetching server status...');

      const data = await this.fetchServerData();
      if (!data) {
        this.logger.error('Failed to fetch server data from API');
        return;
      }

      this.logger.success('Data fetched successfully');
      const embed = this.formatEmbed(data);

      if (this.config.debug) {
        this.logger.info('Embed formatted successfully');
      }

      // Update total players count
      this.totalPlayers = this.getTotalPlayers(data);

      // Check for new lobbies and send notifications
      const lobbies = this.getLobbies(data);
      
      if (this.config.notificationChannelId) {
        const notificationChannel = this.client.channels.cache.get(
          this.config.notificationChannelId
        ) as TextChannel;
        
        if (notificationChannel) {
          await this.notificationManager.checkForNewLobbies(lobbies, notificationChannel);
        } else if (lobbies.length > 0 && this.config.debug) {
          this.logger.warning(`Notification channel ${this.config.notificationChannelId} not found`);
        }
      }

      // Process all channels in parallel for better performance
      await Promise.allSettled(
        this.config.channelIds.map((channelId) => this.updateChannel(channelId, data, embed))
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error in status check: ${err.message}`);
      if (this.config.debug && error instanceof Error) {
        console.error(error);
      }
    }
  }

  /**
   * Update a specific channel with server status
   */
  private async updateChannel(
    channelId: string,
    data: ServerData,
    embed: EmbedBuilder
  ): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(channelId);
      if (!channel) {
        this.logger.error(`Channel ${channelId} not found`);
        return;
      }

      if (channel.type !== ChannelType.GuildText) {
        this.logger.error(`Channel ${channelId} is not a text channel`);
        return;
      }

      const textChannel = channel as TextChannel;

      if (this.config.debug) {
        this.logger.info(`Processing channel: ${textChannel.name}`);
      }

      const message = await this.messageManager.getOrCreateMessage(
        textChannel,
        data,
        (d) => this.formatEmbed(d)
      );

      if (!message) {
        this.logger.error(`Failed to get or create message in #${textChannel.name}`);
        return;
      }

      await message.edit({ embeds: [embed] });
      this.logger.status(`Status updated in #${textChannel.name}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error processing channel ${channelId}: ${err.message}`);
      if (this.config.debug && error instanceof Error) {
        console.error(error);
      }
    }
  }

  /**
   * Start the bot
   */
  public async start(): Promise<void> {
    try {
      await this.client.login(this.config.token);
      await this.readyPromise;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to start bot:', err);
      throw error;
    }
  }

  /**
   * Stop the bot gracefully
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping bot...');

    // Clear intervals
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
    }
    if (this.activityRotationTimer) {
      clearInterval(this.activityRotationTimer);
    }

    // Destroy client
    this.client.destroy();
    this.logger.success('Bot stopped');
  }
}
