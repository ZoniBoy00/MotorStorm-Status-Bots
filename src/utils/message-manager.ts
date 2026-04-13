import { TextChannel, EmbedBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { MessageIdStore, ServerData } from '../types';
import { Logger } from './logger';

/**
 * Manages Discord message persistence across bot restarts using MySQL
 */
export class MessageManager {
  private botName: string;
  private messageIds: MessageIdStore = {};
  private logger: Logger;
  private dataDir: string;
  private filePath: string;

  constructor(botName: string) {
    this.botName = botName;
    this.logger = new Logger(`${botName}-Messages`);
    this.dataDir = path.join(process.cwd(), 'data');
    this.filePath = path.join(this.dataDir, `${botName}_message_ids.json`);
  }

  /**
   * Initialize message manager and load existing message IDs from MySQL
   */
  async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        if (data.trim()) {
          this.messageIds = JSON.parse(data);
          this.logger.info(`Loaded ${Object.keys(this.messageIds).length} message IDs from JSON for ${this.botName}`);
        }
      } else {
        this.messageIds = {};
        this.saveToFile();
      }
    } catch (error) {
      this.logger.error('Error initializing message manager:', error instanceof Error ? error : new Error(String(error)));
      this.messageIds = {};
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.messageIds, null, 2));
    } catch (error) {
      this.logger.error('Error saving message IDs to JSON:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get or create a message in a channel
   */
  async getOrCreateMessage(
    channel: TextChannel,
    data: ServerData,
    formatEmbed: (data: ServerData) => EmbedBuilder
  ): Promise<any | null> {
    // Try to fetch existing message for this channel
    if (this.messageIds[channel.id]) {
      try {
        const message = await channel.messages.fetch(this.messageIds[channel.id]);
        return message;
      } catch (error) {
        // Only delete from DB if it's a "Not Found" error (10008)
        const discordError = error as any;
        if (discordError.code === 10008) {
          this.logger.warning(`Message for channel ${channel.name} was deleted. Creating new one.`);
          delete this.messageIds[channel.id];
          this.saveToFile();
        } else {
          this.logger.error(`Error fetching message in ${channel.name}: ${discordError.message}`);
          return null;
        }
      }
    }

    // Create a new message if no valid message ID exists
    try {
      const embed = formatEmbed(data);
      const message = await channel.send({ embeds: [embed] });

      // Store the new message ID in memory and JSON
      this.messageIds[channel.id] = message.id;
      this.saveToFile();
      this.logger.success(`Created and saved new status message in #${channel.name} (ID: ${message.id})`);
      return message;
    } catch (error) {
      this.logger.error(`Error creating message in channel ${channel.name}:`, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
}
