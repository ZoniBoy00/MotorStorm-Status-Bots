import { PSRewiredApiHandler } from '../../core';

/**
 * API handler for MotorStorm Pacific Rift server data
 */
export class PRApiHandler extends PSRewiredApiHandler {
  constructor() {
    super({
      appId: '21624',
      botName: 'MotorStorm-PR',
      dataKey: 'motorstorm_pr',
      defaultName: 'MotorStorm Pacific Rift',
      defaultMaxPlayers: 12,
    });
  }
}
