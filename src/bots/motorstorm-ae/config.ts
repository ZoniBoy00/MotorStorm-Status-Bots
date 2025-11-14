import { BotConfig } from '../../types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration for MotorStorm Arctic Edge bot
 */
export function getAEConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_AE;
  if (!token) {
    throw new Error('DISCORD_TOKEN_AE environment variable is required');
  }

  // Support both single channel (backward compatible) and multiple channels
  const channelIds = process.env.CHANNEL_IDS_AE
    ? process.env.CHANNEL_IDS_AE.split(',').map((id) => id.trim())
    : ['1358455464299335822', '1384161048562630796'];

  return {
    token,
    channelIds,
    statusCheckInterval: 10000, // 10 seconds
    activityRotationInterval: 30000, // 30 seconds
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Arctic Edge',
    apiEndpoint: 'https://svo.agracingfoundation.org/medius_db/api',
    dataKey: 'motorstorm_ae',
  };
}
