import { PSRewiredApiHandler } from '../../core';

/**
 * API handler for MotorStorm Monument Valley server data
 */
export class MVApiHandler extends PSRewiredApiHandler {
  constructor() {
    super({
      appId: '20764',
      botName: 'MotorStorm-MV',
      dataKey: 'motorstorm_mv',
      defaultName: 'MotorStorm NTSC',
      defaultMaxPlayers: 12,
    });
  }
}
