import { BotConfig } from '../../types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration for MotorStorm Apocalypse bot
 */
export function getApocConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_APOC;
  if (!token) {
    throw new Error('DISCORD_TOKEN_APOC environment variable is required');
  }

  const channelIds = process.env.CHANNEL_IDS_APOC
    ? process.env.CHANNEL_IDS_APOC.split(',').map((id) => id.trim())
    : ['1358455464299335822'];

  return {
    token,
    channelIds,
    statusCheckInterval: 10000,
    activityRotationInterval: 30000,
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Apocalypse',
    apiEndpoint: 'http://api.psorg-web-revival.us:61920',
    dataKey: 'motorstorm_msa',
  };
}
