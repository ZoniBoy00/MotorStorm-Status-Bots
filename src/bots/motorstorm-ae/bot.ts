import { ActivityType, EmbedBuilder } from 'discord.js';
import { BaseBot } from '../../core';
import { ActivityConfig, ServerData } from '../../types';
import { AEApiHandler } from './api-handler';
import { buildAEEmbed } from './embed-builder';
import { getAEConfig } from './config';

/**
 * MotorStorm Arctic Edge Discord Bot
 */
export class MotorStormAEBot extends BaseBot {
  private apiHandler: AEApiHandler;

  constructor() {
    super(getAEConfig(), 'MotorStorm-AE');
    this.apiHandler = new AEApiHandler();
  }

  protected getActivities(): ActivityConfig[] {
    return [
      {
        type: ActivityType.Watching,
        message: 'Monitoring MotorStorm Arctic Edge servers',
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
    return buildAEEmbed(data);
  }

  protected getTotalPlayers(data: ServerData): number {
    return data.motorstorm_ae.summary.total_players;
  }
}
