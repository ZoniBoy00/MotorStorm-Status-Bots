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
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(RUNTIME_CONFIG_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RuntimeChannels;
    } catch {
      // Ignore malformed optional runtime configuration.
    }
  }
  return {};
}

/**
 * Configuration for MotorStorm Pacific Rift bot
 */
export function getPRConfig(): BotConfig {
  const token = process.env.DISCORD_TOKEN_PR;
  if (!token) {
    throw new Error('DISCORD_TOKEN_PR environment variable is required');
  }

  let channelIds: string[] = [];
  const channelIdsEnv = process.env.CHANNEL_IDS_PR;
  if (channelIdsEnv) {
    channelIds = channelIdsEnv.split(',').map((id) => id.trim()).filter(Boolean);
  }

  const runtimeChannels = loadRuntimeChannels();
  if (runtimeChannels['pr']) {
    channelIds = [...channelIds, ...runtimeChannels['pr']];
  }

  if (channelIds.length === 0) {
    throw new Error('CHANNEL_IDS_PR environment variable is required (comma-separated channel IDs)');
  }

  channelIds = [...new Set(channelIds)];

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
