import { ActivityType, EmbedBuilder } from 'discord.js';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData, Lobby } from '../../types';
import { ApocApiHandler } from './api-handler';
import { buildApocEmbed } from './embed-builder';
import { getApocConfig } from './config';

/**
 * MotorStorm Apocalypse Discord Bot
 */
export class MotorStormApocBot extends BaseBot {
  private apiHandler: ApocApiHandler;

  constructor() {
    super(getApocConfig(), 'MotorStorm-Apoc');
    this.apiHandler = new ApocApiHandler();
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
    return data.motorstorm_msa.summary.total_players;
  }

  protected getLobbies(data: ServerData): Lobby[] {
    return data.motorstorm_msa.lobbies;
  }
}
