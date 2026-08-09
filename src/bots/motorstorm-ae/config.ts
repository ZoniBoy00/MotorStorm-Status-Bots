import * as fs from 'fs';
import * as path from 'path';
import { BotConfig } from '../../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-channels.json');

interface RuntimeChannels {
  [key: string]: string[];
}

function loadRuntimeChannels(): RuntimeChannels {
  if (fs.existsSync(RUNTIME_CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(RUNTIME_CONFIG_FILE, 'utf-8'));
  }
  return {};
}

/**
 * Configuration for MotorStorm Arctic Edge bot
 */
export function getAEConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_AE;
  if (!token) {
    throw new Error('DISCORD_TOKEN_AE environment variable is required');
  }

  let channelIds: string[] = [];
  const channelIdsEnv = process.env.CHANNEL_IDS_AE;
  if (channelIdsEnv) {
    channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);
  }

  const runtimeChannels = loadRuntimeChannels();
  if (runtimeChannels['ae']) {
    channelIds = [...channelIds, ...runtimeChannels['ae']];
  }

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_AE environment variable is required (comma-separated channel IDs)');
  }

  channelIds = [...new Set(channelIds)];

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
