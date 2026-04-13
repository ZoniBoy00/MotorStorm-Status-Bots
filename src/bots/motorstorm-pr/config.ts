import { BotConfig } from '../../types';

/**
 * Configuration for MotorStorm Pacific Rift bot
 */
export function getPRConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_PR;
  if (!token) {
    throw new Error('DISCORD_TOKEN_PR environment variable is required');
  }

  const channelIdsEnv = process.env.CHANNEL_IDS_PR;
  if (!channelIdsEnv) {
    throw new Error('CHANNEL_IDS_PR environment variable is required (comma-separated channel IDs)');
  }

  const channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_PR must contain at least one channel ID');
  }

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_PR;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_PR;
  const notificationPingsEnabled = process.env.NOTIFICATION_PINGS_PR === 'true';

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[PR Config] Environment Variables:\x1b[0m');
    console.log(`  CHANNEL_IDS_PR: ${channelIds.join(', ')}`);
    console.log(`  NOTIFICATION_CHANNEL_PR: ${notificationChannelId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_ROLE_PR: ${notificationRoleId ? '***' : '(not set)'}`);
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
