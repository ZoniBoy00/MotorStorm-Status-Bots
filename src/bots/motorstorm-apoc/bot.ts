import { ActivityType, EmbedBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData, Lobby } from '../../types';
import { ApocApiHandler } from './api-handler';
import { buildApocEmbed } from './embed-builder';
import { getApocConfig } from './config';

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-channels.json');

interface RuntimeChannels {
  [key: string]: string[];
}

function loadRuntimeChannels(): RuntimeChannels {
  if (fs.existsSync(RUNTIME_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(RUNTIME_CONFIG_FILE, 'utf-8'));
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
 * MotorStorm Apocalypse Discord Bot
 */
export class MotorStormApocBot extends BaseBot {
  private apiHandler: ApocApiHandler;

  constructor() {
    super(getApocConfig(), 'MotorStorm-Apoc');
    this.apiHandler = new ApocApiHandler();
  }

  public async handleSetupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const channel = interaction.options.getChannel('channel', true, [ChannelType.GuildText]);
    if (!channel) {
      await interaction.reply({ content: '❌ Please specify a text channel.', ephemeral: true });
      return;
    }

    saveRuntimeChannel('apoc', channel.id);
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
        message: 'Monitoring MotorStorm Apocalypse server',
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
    return buildApocEmbed(data);
  }

  protected getTotalPlayers(data: ServerData): number {
    return data.motorstorm_apoc.summary.total_players;
  }

  protected getLobbies(data: ServerData): Lobby[] {
    return data.motorstorm_apoc.lobbies;
  }
}
