import { MotorStormAEBot } from './bots/motorstorm-ae';
import { MotorStormApocBot } from './bots/motorstorm-apoc';
import { MotorStormPRBot } from './bots/motorstorm-pr';
import { MotorStormMVBot } from './bots/motorstorm-mv';
import { HelperBot } from './bots/motorstorm-helper/bot';
import { Database } from './utils/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Main entry point for running all MotorStorm bots simultaneously
 */
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   MotorStorm Status Bots - Unified Launcher v2.2      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.dim}Initializing database...${colors.reset}`);
  try {
    await Database.init();
    console.log(`${colors.green}Database connected successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to initialize database. Startup aborted: ${(error as Error).message}${colors.reset}`);
    process.exitCode = 1;
    return;
  }
  console.log('');

  const bots: Array<{ name: string; instance: any }> = [];
  const errors: Array<{ name: string; error: Error }> = [];

  const botConfigs = [
    { name: 'Arctic Edge', Bot: MotorStormAEBot, enabled: !!process.env.DISCORD_TOKEN_AE },
    { name: 'Apocalypse', Bot: MotorStormApocBot, enabled: !!process.env.DISCORD_TOKEN_APOC },
    { name: 'Pacific Rift', Bot: MotorStormPRBot, enabled: !!process.env.DISCORD_TOKEN_PR },
    { name: 'Monument Valley', Bot: MotorStormMVBot, enabled: !!process.env.DISCORD_TOKEN_MV },
    { name: 'Helper (Analytics)', Bot: HelperBot, enabled: !!process.env.DISCORD_TOKEN_HELPER },
  ];

  console.log(`${colors.bright}📋 Bot Configuration:${colors.reset}`);
  botConfigs.forEach(({ name, enabled }) => {
    const icon = enabled ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    const status = enabled ? `${colors.green}Enabled${colors.reset}` : `${colors.dim}Disabled${colors.reset}`;
    console.log(`   ${icon} ${colors.bright}${name}${colors.reset}: ${status}`);
  });
  console.log('');

  for (const { name, Bot, enabled } of botConfigs) {
    if (!enabled) {
      continue;
    }

    try {
      console.log(`${colors.blue}🚀 Starting ${colors.bright}${name}${colors.reset}${colors.blue} bot...${colors.reset}`);
      const bot = new Bot();
      await bot.start();
      bots.push({ name, instance: bot });
      console.log(`${colors.green}✅ ${colors.bright}${name}${colors.reset}${colors.green} bot ready!${colors.reset}\n`);
      
      await delay(500);
    } catch (error) {
      const err = error as Error;
      console.error(`${colors.red}❌ Failed to start ${name} bot: ${err.message}${colors.reset}\n`);
      errors.push({ name, error: err });
    }
  }

  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${colors.green}${bots.length} bot(s) running${colors.reset}, ${errors.length > 0 ? `${colors.red}${errors.length} failed${colors.reset}` : `${colors.green}0 failed${colors.reset}`}  ${colors.bright}${colors.cyan}                         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (bots.length === 0) {
    console.error(`${colors.red}❌ No bots were started successfully. Exiting...${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.bright}${colors.green}🎮 All configured bots are running!${colors.reset}`);
  console.log(`${colors.dim}   Press Ctrl+C to stop all bots gracefully.${colors.reset}\n`);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log(`\n\n${colors.yellow}🛑 Shutdown signal received. Stopping all bots...${colors.reset}\n`);

    for (const { name, instance } of bots) {
      try {
        console.log(`${colors.dim}   Stopping ${name}...${colors.reset}`);
        await instance.stop();
        console.log(`${colors.green}   ✅ ${name} stopped${colors.reset}`);
      } catch (error) {
        const err = error as Error;
        console.error(`${colors.red}   ❌ Error stopping ${name}: ${err.message}${colors.reset}`);
      }
    }

    console.log(`\n${colors.green}✅ All bots stopped successfully. Goodbye!${colors.reset}\n`);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('unhandledRejection', (reason) => {
    console.error(`${colors.red}⚠️  Unhandled Promise Rejection:${colors.reset}`, reason);
    console.error(`${colors.dim}The bot will continue running, but please check for issues.${colors.reset}`);
  });

  process.on('uncaughtException', (error) => {
    console.error(`${colors.red}⚠️  Uncaught Exception:${colors.reset}`, error);
    console.error(`${colors.red}Shutting down gracefully...${colors.reset}`);
    process.exit(1);
  });
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
