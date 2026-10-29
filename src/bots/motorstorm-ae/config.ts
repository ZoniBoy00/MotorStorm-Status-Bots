import { BotConfig } from '../../types';
import { buildStatusBotConfig } from '../../utils';

/**
 * Configuration for MotorStorm Arctic Edge bot
 */
export function getAEConfig(): BotConfig {
  return buildStatusBotConfig({
    envSuffix: 'AE',
    runtimeKey: 'ae',
    gameName: 'MotorStorm Arctic Edge',
    apiEndpoint: 'https://svo.agracingfoundation.org/medius_db/api',
    dataKey: 'motorstorm_ae',
  });
}
