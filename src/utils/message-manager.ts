import { TextChannel, EmbedBuilder } from 'discord.js';
import { MessageIdStore, ServerData } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Manages Discord message persistence across bot restarts
 */
export class MessageManager {
  private messageIdsFile: string;
  private messageIds: MessageIdStore = {};

  constructor(botName: string) {
    this.messageIdsFile = path.join(__dirname, '..', '..', 'data', `${botName}_message_ids.json`);
  }

  /**
   * Initialize message manager and load existing message IDs
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.messageIdsFile);
      await fs.mkdir(dataDir, { recursive: true });

      // Load existing message IDs
      try {
        const fileContent = await fs.readFile(this.messageIdsFile, 'utf8');
        this.messageIds = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist yet, start with empty object
        this.messageIds = {};
      }
    } catch (error) {
      console.error('Error initializing message manager:', error);
      this.messageIds = {};
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
        console.error(`Error fetching message for channel ${channel.name}:`, error);
        // Remove invalid message ID
        delete this.messageIds[channel.id];
      }
    }

    // Create a new message if no valid message ID exists
    try {
      const embed = formatEmbed(data);
      const message = await channel.send({ embeds: [embed] });

      // Store the new message ID
      this.messageIds[channel.id] = message.id;
      await this.saveMessageIds();

      console.log(`Created new message ${message.id} in channel ${channel.name}`);
      return message;
    } catch (error) {
      console.error(`Error creating message in channel ${channel.name}:`, error);
      return null;
    }
  }

  /**
   * Save message IDs to file
   */
  private async saveMessageIds(): Promise<void> {
    try {
      await fs.writeFile(this.messageIdsFile, JSON.stringify(this.messageIds, null, 2));
    } catch (error) {
      console.error('Error saving message IDs:', error);
    }
  }
}
