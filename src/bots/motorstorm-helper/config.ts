import { BotConfig } from '../../types';

export const helperConfig: BotConfig = {
  token: process.env.DISCORD_TOKEN_HELPER || '',
  channelIds: process.env.CHANNEL_IDS_HELPER?.split(',') || [],
  statusCheckInterval: 300000, // 5 minutes
  activityRotationInterval: 30000, // 30 seconds
  debug: process.env.DEBUG === 'true',
  gameName: 'MotorStorm Helper',
  apiEndpoint: '',
  dataKey: 'motorstorm_helper',
};
