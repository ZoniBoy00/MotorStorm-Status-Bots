import { HelperBot } from './bot';
import { helperConfig } from './config';

if (!helperConfig.token) {
  console.error('Missing DISCORD_TOKEN_HELPER environment variable');
  process.exit(1);
}

const bot = new HelperBot();

bot.start().catch((error) => {
  console.error('Failed to start Helper bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await bot.stop();
  process.exit(0);
});
