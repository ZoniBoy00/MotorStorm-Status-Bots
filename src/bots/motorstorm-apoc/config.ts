import { BotConfig } from '../../types';

/**
 * Configuration for MotorStorm Apocalypse bot
 */
export function getApocConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_APOC;
  if (!token) {
    throw new Error('DISCORD_TOKEN_APOC environment variable is required');
  }

  const channelIdsEnv = process.env.CHANNEL_IDS_APOC;
  if (!channelIdsEnv) {
    throw new Error('CHANNEL_IDS_APOC environment variable is required (comma-separated channel IDs)');
  }

  const channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_APOC must contain at least one channel ID');
  }

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_APOC;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_APOC;
  const notificationPingsEnabled = process.env.NOTIFICATION_PINGS_APOC === 'true';

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[Apoc Config] Environment Variables:\x1b[0m');
    console.log(`  CHANNEL_IDS_APOC: ${channelIds.join(', ')}`);
    console.log(`  NOTIFICATION_CHANNEL_APOC: ${notificationChannelId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_ROLE_APOC: ${notificationRoleId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_PINGS_APOC: ${notificationPingsEnabled ? 'true' : 'false'}`);
  }

  return {
    token,
    channelIds,
    statusCheckInterval: 10000,
    activityRotationInterval: 30000,
    debug: process.env.DEBUG === 'true',
    gameName: 'MotorStorm Apocalypse',
    apiEndpoint: 'https://api.psrewired.com/us/api',
    dataKey: 'motorstorm_msa',
    notificationChannelId,
    notificationRoleId,
    notificationPingsEnabled,
  };
}
