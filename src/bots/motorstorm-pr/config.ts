import { BotConfig } from '../../types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration for MotorStorm Pacific Rift bot
 */
export function getPRConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_PR;
  if (!token) {
    throw new Error('DISCORD_TOKEN_PR environment variable is required');
  }

  const channelIds = process.env.CHANNEL_IDS_PR
    ? process.env.CHANNEL_IDS_PR.split(',').map((id) => id.trim())
    : ['1358455464299335822'];

  return {
    token,
    channelIds,
    statusCheckInterval: 10000,
    activityRotationInterval: 30000,
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Pacific Rift',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_pr',
  };
}
