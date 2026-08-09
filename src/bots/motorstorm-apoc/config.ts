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
 * Configuration for MotorStorm Apocalypse bot
 */
export function getApocConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_APOC;
  if (!token) {
    throw new Error('DISCORD_TOKEN_APOC environment variable is required');
  }

  let channelIds: string[] = [];
  const channelIdsEnv = process.env.CHANNEL_IDS_APOC;
  if (channelIdsEnv) {
    channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);
  }

  const runtimeChannels = loadRuntimeChannels();
  if (runtimeChannels['apoc']) {
    channelIds = [...channelIds, ...runtimeChannels['apoc']];
  }

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_APOC environment variable is required (comma-separated channel IDs)');
  }

  channelIds = [...new Set(channelIds)];

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
