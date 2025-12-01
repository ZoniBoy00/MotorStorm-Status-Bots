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

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_PR;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_PR;
  const notificationPingsEnabled = process.env.NOTIFICATION_PINGS_PR !== 'false';

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[PR Config] Environment Variables:\x1b[0m');
    console.log(`  NOTIFICATION_CHANNEL_PR: ${notificationChannelId || '\x1b[90m(not set)\x1b[0m'}`);
    console.log(`  NOTIFICATION_ROLE_PR: ${notificationRoleId || '\x1b[90m(not set)\x1b[0m'}`);
    console.log(`  NOTIFICATION_PINGS_PR: ${notificationPingsEnabled ? 'true' : 'false'}`);
  }

  return {
    token,
    channelIds,
    statusCheckInterval: 10000,
    activityRotationInterval: 30000,
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Pacific Rift',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_pr',
    notificationChannelId,
    notificationRoleId,
    notificationPingsEnabled,
  };
}
