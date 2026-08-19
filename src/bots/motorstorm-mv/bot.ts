import { ActivityType, EmbedBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData, Lobby } from '../../types';
import { MVApiHandler } from './api-handler';
import { buildMVEmbed } from './embed-builder';
import { getMVConfig } from './config';

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-channels.json');

interface RuntimeChannels {
  [key: string]: string[];
}

function loadRuntimeChannels(): RuntimeChannels {
  if (fs.existsSync(RUNTIME_CONFIG_FILE)) {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(RUNTIME_CONFIG_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RuntimeChannels;
    } catch {
      // Ignore malformed optional runtime configuration.
    }
  }
  return {};
}

function saveRuntimeChannel(botKey: string, channelId: string): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const config = loadRuntimeChannels();
  if (!config[botKey]) {
    config[botKey] = [];
  }
  if (!config[botKey].includes(channelId)) {
    config[botKey].push(channelId);
    fs.writeFileSync(RUNTIME_CONFIG_FILE, JSON.stringify(config, null, 2));
  }
}

/**
 * MotorStorm Monument Valley Discord Bot
 */
export class MotorStormMVBot extends BaseBot {
  private apiHandler: MVApiHandler;

  constructor() {
    super(getMVConfig(), 'MotorStorm-MV');
    this.apiHandler = new MVApiHandler();
  }

  public async handleSetupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
    if (!channel) {
      await interaction.reply({ content: '❌ Please specify a text channel.', ephemeral: true });
      return;
    }

    saveRuntimeChannel('mv', channel.id);
    const currentChannels = this.config.channelIds;
    (this.config as any).channelIds = [...new Set([...currentChannels, channel.id])];

    await interaction.reply({
      content: `✅ Status channel set to ${channel.toString()}. The bot will now post server status here.`,
      ephemeral: true
    });
  }

  protected getActivities(): ActivityConfig[] {
    return [
      {
        type: ActivityType.Watching,
        message: 'Monitoring MotorStorm Monument Valley server',
      },
      {
        type: ActivityType.Watching,
        message: '{totalPlayers} players online',
      },
    ];
  }

  protected async fetchServerData(): Promise<ServerData | null> {
    return this.apiHandler.fetchData();
  }

  protected formatEmbed(data: ServerData): EmbedBuilder {
    return buildMVEmbed(data);
  }

  protected getTotalPlayers(data: ServerData): number {
    return data.motorstorm_mv.summary.total_players;
  }

  protected getLobbies(data: ServerData): Lobby[] {
    return data.motorstorm_mv.lobbies;
  }
}
