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
 * Configuration for MotorStorm Monument Valley bot
 */
export function getMVConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_MV;
  if (!token) {
    throw new Error('DISCORD_TOKEN_MV environment variable is required');
  }

  let channelIds: string[] = [];
  const channelIdsEnv = process.env.CHANNEL_IDS_MV;
  if (channelIdsEnv) {
    channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);
  }

  const runtimeChannels = loadRuntimeChannels();
  if (runtimeChannels['mv']) {
    channelIds = [...channelIds, ...runtimeChannels['mv']];
  }

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_MV environment variable is required (comma-separated channel IDs)');
  }

  channelIds = [...new Set(channelIds)];

  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_MV;
  const notificationRoleId = process.env.NOTIFICATION_ROLE_MV;
  const notificationPingsEnabled = process.env.NOTIFICATION_PINGS_MV === 'true';

  if (process.env.DEBUG === 'true') {
    console.log('\x1b[36m[MV Config] Environment Variables:\x1b[0m');
    console.log(`  CHANNEL_IDS_MV: ${channelIds.join(', ')}`);
    console.log(`  NOTIFICATION_CHANNEL_MV: ${notificationChannelId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_ROLE_MV: ${notificationRoleId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_PINGS_MV: ${notificationPingsEnabled ? 'true' : 'false'}`);
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
    notificationPingsEnabled,
  };
}
