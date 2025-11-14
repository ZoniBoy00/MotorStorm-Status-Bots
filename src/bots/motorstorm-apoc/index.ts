import { MotorStormApocBot } from './bot';

/**
 * Entry point for MotorStorm Apocalypse bot
 */
async function main() {
  const bot = new MotorStormApocBot();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  // Start the bot
  try {
    await bot.start();
  } catch (error) {
    console.error('Failed to start MotorStorm Apoc bot:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { MotorStormApocBot };
