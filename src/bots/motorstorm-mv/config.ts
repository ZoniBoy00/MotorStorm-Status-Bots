import { BotConfig } from '../../types';
import { buildStatusBotConfig } from '../../utils';

/**
 * Configuration for MotorStorm Monument Valley bot
 */
export function getMVConfig(): BotConfig {
  return buildStatusBotConfig({
    envSuffix: 'MV',
    runtimeKey: 'mv',
    gameName: 'MotorStorm Monument Valley',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_mv',
  });
}
