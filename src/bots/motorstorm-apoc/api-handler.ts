import { PSRewiredApiHandler } from '../../core';

/**
 * API handler for MotorStorm Apocalypse server data
 */
export class ApocApiHandler extends PSRewiredApiHandler {
  constructor() {
    super({
      appId: '22500',
      botName: 'MotorStorm-Apoc',
      dataKey: 'motorstorm_apoc',
      defaultName: 'MotorStorm Apocalypse',
      defaultMaxPlayers: 16,
    });
  }
}
