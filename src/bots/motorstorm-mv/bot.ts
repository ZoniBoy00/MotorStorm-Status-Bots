import { ActivityType, EmbedBuilder } from 'discord.js';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData, Lobby } from '../../types';
import { MVApiHandler } from './api-handler';
import { buildMVEmbed } from './embed-builder';
import { getMVConfig } from './config';

/**
 * MotorStorm Monument Valley Discord Bot
 */
export class MotorStormMVBot extends BaseBot {
  private apiHandler: MVApiHandler;

  constructor() {
    super(getMVConfig(), 'MotorStorm-MV');
    this.apiHandler = new MVApiHandler();
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
