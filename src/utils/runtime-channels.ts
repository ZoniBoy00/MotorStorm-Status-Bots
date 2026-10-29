import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const RUNTIME_CONFIG_FILE = path.join(DATA_DIR, 'runtime-channels.json');

/** Discord snowflake IDs are 17-20 digit numbers */
const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

interface RuntimeChannels {
  [botKey: string]: string[];
}

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE_PATTERN.test(value);
}

/**
 * Load channels added at runtime via /setup. Malformed files or entries are ignored.
 */
export function loadRuntimeChannels(file: string = RUNTIME_CONFIG_FILE): RuntimeChannels {
  if (!fs.existsSync(file)) return {};

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const result: RuntimeChannels = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (Array.isArray(value)) {
        result[key] = value.filter((id): id is string => typeof id === 'string' && isSnowflake(id));
      }
    }
    return result;
  } catch {
    // Ignore malformed optional runtime configuration.
    return {};
  }
}

/**
 * Persist a runtime channel for a bot. Returns false if the channel was already registered.
 */
export function saveRuntimeChannel(botKey: string, channelId: string, file: string = RUNTIME_CONFIG_FILE): boolean {
  if (!isSnowflake(channelId)) {
    throw new Error(`Invalid channel ID: ${channelId}`);
  }

  const config = loadRuntimeChannels(file);
  const channels = config[botKey] ?? [];
  if (channels.includes(channelId)) return false;

  config[botKey] = [...channels, channelId];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  return true;
}
