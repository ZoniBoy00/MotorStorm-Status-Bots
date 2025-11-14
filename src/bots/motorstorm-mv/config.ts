import { BotConfig } from '../../types';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Configuration for MotorStorm Monument Valley bot
 */
export function getMVConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_MV;
  if (!token) {
    throw new Error('DISCORD_TOKEN_MV environment variable is required');
  }

  const channelIds = process.env.CHANNEL_IDS_MV
    ? process.env.CHANNEL_IDS_MV.split(',').map((id) => id.trim())
    : ['1358455464299335822'];

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_MV;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_MV;

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[MV Config] Environment Variables:\x1b[0m');
    console.log(`  NOTIFICATION_CHANNEL_MV: ${notificationChannelId || '\x1b[90m(not set)\x1b[0m'}`);
    console.log(`  NOTIFICATION_ROLE_MV: ${notificationRoleId || '\x1b[90m(not set)\x1b[0m'}`);
  }

  return {
    token,
    channelIds,
    statusCheckInterval: 10000,
    activityRotationInterval: 30000,
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Monument Valley',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_mv',
    notificationChannelId,
    notificationRoleId,
  };
}
