import { ActivityType, EmbedBuilder } from 'discord.js';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData, Lobby } from '../../types';
import { PRApiHandler } from './api-handler';
import { buildPREmbed } from './embed-builder';
import { getPRConfig } from './config';

/**
 * MotorStorm Pacific Rift Discord Bot
 */
export class MotorStormPRBot extends BaseBot {
  private apiHandler: PRApiHandler;

  constructor() {
    super(getPRConfig(), 'MotorStorm-PR');
    this.apiHandler = new PRApiHandler();
  }

  protected getActivities(): ActivityConfig[] {
    return [
      {
        type: ActivityType.Watching,
        message: 'Monitoring MotorStorm PR server',
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
    return buildPREmbed(data);
  }

  protected getTotalPlayers(data: ServerData): number {
    return data.motorstorm_pr.summary.total_players;
  }

  protected getLobbies(data: ServerData): Lobby[] {
    return data.motorstorm_pr.lobbies;
  }
}
