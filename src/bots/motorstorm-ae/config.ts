import { BotConfig } from '../../types';

/**
 * Configuration for MotorStorm Arctic Edge bot
 */
export function getAEConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_AE;
  if (!token) {
    throw new Error('DISCORD_TOKEN_AE environment variable is required');
  }

  const channelIdsEnv = process.env.CHANNEL_IDS_AE;
  if (!channelIdsEnv) {
    throw new Error('CHANNEL_IDS_AE environment variable is required (comma-separated channel IDs)');
  }

  const channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_AE must contain at least one channel ID');
  }

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_AE;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_AE;
  const notificationPingsEnabled = process.env.NOTIFICATION_PINGS_AE === 'true';

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[AE Config] Environment Variables:\x1b[0m');
    console.log(`  CHANNEL_IDS_AE: ${channelIds.join(', ')}`);
    console.log(`  NOTIFICATION_CHANNEL_AE: ${notificationChannelId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_ROLE_AE: ${notificationRoleId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_PINGS_AE: ${notificationPingsEnabled ? 'true' : 'false'}`);
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
    notificationPingsEnabled,
  };
}
