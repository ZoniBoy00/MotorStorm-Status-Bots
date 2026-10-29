import { BotConfig } from '../../types';
import { buildStatusBotConfig } from '../../utils';

/**
 * Configuration for MotorStorm Pacific Rift bot
 */
export function getPRConfig(): BotConfig {
  return buildStatusBotConfig({
    envSuffix: 'PR',
    runtimeKey: 'pr',
    gameName: 'MotorStorm Pacific Rift',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_pr',
  });
}
