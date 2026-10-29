import { BotConfig } from '../../types';
import { buildStatusBotConfig } from '../../utils';

/**
 * Configuration for MotorStorm Apocalypse bot
 */
export function getApocConfig(): BotConfig {
  return buildStatusBotConfig({
    envSuffix: 'APOC',
    runtimeKey: 'apoc',
    gameName: 'MotorStorm Apocalypse',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_msa',
  });
}
