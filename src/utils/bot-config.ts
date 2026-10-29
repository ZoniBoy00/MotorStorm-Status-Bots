import { BotConfig } from '../types';
import { loadRuntimeChannels } from './runtime-channels';

export interface StatusBotDefinition {
  /** Environment variable suffix, e.g. "AE" for DISCORD_TOKEN_AE */
  envSuffix: string;
  /** Key used in data/runtime-channels.json, e.g. "ae" */
  runtimeKey: string;
  gameName: string;
  apiEndpoint: string;
  dataKey: string;
}

/**
 * Build a status bot configuration from environment variables and runtime channels.
 */
export function buildStatusBotConfig(def: StatusBotDefinition, env: NodeJS.ProcessEnv = process.env): BotConfig {
  const { envSuffix, runtimeKey } = def;

  const token = env[`DISCORD_TOKEN_${envSuffix}`];
  if (!token) {
    throw new Error(`DISCORD_TOKEN_${envSuffix} environment variable is required`);
  }

  const envChannels = (env[`CHANNEL_IDS_${envSuffix}`] ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const runtimeChannels = loadRuntimeChannels()[runtimeKey] ?? [];
  const channelIds = [...new Set([...envChannels, ...runtimeChannels])];

  if (channelIds.length === 0) {
    throw new Error(`CHANNEL_IDS_${envSuffix} environment variable is required (comma-separated channel IDs)`);
  }

  const notificationChannelId = env[`NOTIFICATION_CHANNEL_${envSuffix}`] || undefined;
  const notificationRoleId = env[`NOTIFICATION_ROLE_${envSuffix}`] || undefined;
  const notificationPingsEnabled = env[`NOTIFICATION_PINGS_${envSuffix}`] === 'true';
  const debug = env.DEBUG === 'true';

  if (debug) {
    console.log(`\x1b[36m[${envSuffix} Config] Environment Variables:\x1b[0m`);
    console.log(`  CHANNEL_IDS_${envSuffix}: ${channelIds.join(', ')}`);
    console.log(`  NOTIFICATION_CHANNEL_${envSuffix}: ${notificationChannelId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_ROLE_${envSuffix}: ${notificationRoleId ? '***' : '(not set)'}`);
    console.log(`  NOTIFICATION_PINGS_${envSuffix}: ${notificationPingsEnabled ? 'true' : 'false'}`);
  }

  return {
    token,
    channelIds,
    runtimeKey,
    statusCheckInterval: 20000, // 20 seconds
    activityRotationInterval: 30000, // 30 seconds
    debug,
    gameName: def.gameName,
    apiEndpoint: def.apiEndpoint,
    dataKey: def.dataKey,
    notificationChannelId,
    notificationRoleId,
    notificationPingsEnabled,
  };
}
