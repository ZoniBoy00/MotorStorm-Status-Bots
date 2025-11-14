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

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_AE;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_AE;

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[AE Config] Environment Variables:\x1b[0m');
    console.log(`  NOTIFICATION_CHANNEL_AE: ${notificationChannelId || '\x1b[90m(not set)\x1b[0m'}`);
    console.log(`  NOTIFICATION_ROLE_AE: ${notificationRoleId || '\x1b[90m(not set)\x1b[0m'}`);
  }

  return {
    token,
    channelIds,
    statusCheckInterval: 10000, // 10 seconds
    activityRotationInterval: 30000, // 30 seconds
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Arctic Edge',
    apiEndpoint: 'https://svo.agracingfoundation.org/medius_db/api',
    dataKey: 'motorstorm_ae',
    notificationChannelId,
    notificationRoleId,
  };
}
