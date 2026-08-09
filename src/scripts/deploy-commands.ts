import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const helperCommands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands and their descriptions'),

  new SlashCommandBuilder()
    .setName('dns')
    .setDescription('View DNS addresses and server information for all MotorStorm games'),

  new SlashCommandBuilder()
    .setName('activity')
    .setDescription('View player activity over time')
    .addIntegerOption((option) =>
      option.setName('hours')
        .setDescription('Hours to display (default: 24)')
        .setMinValue(1)
        .setMaxValue(168)
    ),

  new SlashCommandBuilder()
    .setName('peaktimes')
    .setDescription('View peak activity times by hour'),

  new SlashCommandBuilder()
    .setName('weekdays')
    .setDescription('View activity patterns by day of the week'),

  new SlashCommandBuilder()
    .setName('gamedist')
    .setDescription('View game distribution across MotorStorm titles'),

  new SlashCommandBuilder()
    .setName('playerstats')
    .setDescription('View statistics for a specific player')
    .addStringOption((option) =>
      option.setName('player')
        .setDescription('Player name')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('topplayers')
    .setDescription('View most active players')
    .addIntegerOption((option) =>
      option.setName('limit')
        .setDescription('Number of players to show (default: 10)')
        .setMinValue(1)
        .setMaxValue(25)
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View different player leaderboards')
    .addStringOption((option) =>
      option.setName('type')
        .setDescription('Leaderboard type')
        .setRequired(true)
        .addChoices(
          { name: 'Most Active (Total Time)', value: 'active' },
          { name: 'Longest Streak', value: 'streak' },
          { name: 'Most Diverse (All Games)', value: 'diverse' },
          { name: 'Most Social (Co-Players)', value: 'social' }
        )
    )
    .addIntegerOption((option) =>
      option.setName('limit')
        .setDescription('Number of players (default: 10)')
        .setMinValue(5)
        .setMaxValue(25)
    ),

  new SlashCommandBuilder()
    .setName('lobbies')
    .setDescription('View lobby statistics and popular hosts'),

  new SlashCommandBuilder()
    .setName('sessions')
    .setDescription('View session duration and player behavior analytics'),

  new SlashCommandBuilder()
    .setName('retention')
    .setDescription('View player retention and return rate statistics'),

  new SlashCommandBuilder()
    .setName('growth')
    .setDescription('View player growth trends over time')
    .addIntegerOption((option) =>
      option.setName('days')
        .setDescription('Days to display (default: 14)')
        .setMinValue(7)
        .setMaxValue(90)
    ),

  new SlashCommandBuilder()
    .setName('predict')
    .setDescription('View predicted peak times for upcoming days'),

  new SlashCommandBuilder()
    .setName('current')
    .setDescription('View current online players across all games'),

  new SlashCommandBuilder()
    .setName('averages')
    .setDescription('View comprehensive average statistics across all players and games'),

  new SlashCommandBuilder()
    .setName('random')
    .setDescription('Generate a random track from a MotorStorm game')
    .addStringOption((option) =>
      option.setName('game')
        .setDescription('Select the MotorStorm game')
        .setRequired(false)
        .addChoices(
          { name: 'Monument Valley', value: 'mv' },
          { name: 'Pacific Rift', value: 'pr' },
          { name: 'Arctic Edge', value: 'ae' },
          { name: 'Apocalypse', value: 'apoc' }
        )
    ),
];

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the bot status channel')
  .addChannelOption((option) =>
    option.setName('channel')
      .setDescription('Text channel for status updates')
      .setRequired(true)
  );

const statusBotCommands = [setupCommand];

async function deployCommands() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!clientId) {
    console.error('Error: DISCORD_CLIENT_ID environment variable is required');
    console.error('You can get this from the Discord Developer Portal');
    process.exit(1);
  }

  const helperToken = process.env.DISCORD_TOKEN_HELPER;
  const aeToken = process.env.DISCORD_TOKEN_AE;

  if (!helperToken && !aeToken) {
    console.error('Error: At least one DISCORD_TOKEN_* environment variable is required');
    process.exit(1);
  }

  const restHelper = helperToken ? new REST({ version: '10' }).setToken(helperToken) : null;
  const restAe = aeToken ? new REST({ version: '10' }).setToken(aeToken) : null;

  try {
    if (restHelper) {
      console.log('🚀 Registering Helper bot commands...');
      const allCommands = [...helperCommands];
      if (guildId) {
        console.log(`   Deploying to guild: ${guildId} (development mode)`);
        await restHelper.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: allCommands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Helper commands registered!');
      } else {
        await restHelper.put(
          Routes.applicationCommands(clientId),
          { body: allCommands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Helper commands registered globally!');
      }
      console.log(`   Registered ${allCommands.length} commands`);
    }

    if (restAe) {
      console.log('🚀 Registering Status bot commands (/setup)...');
      const statusCommands = [setupCommand];
      if (guildId) {
        await restAe.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: statusCommands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Status bot commands registered to guild!');
      } else {
        await restAe.put(
          Routes.applicationCommands(clientId),
          { body: statusCommands.map(cmd => cmd.toJSON()) }
        );
        console.log('✅ Status bot commands registered globally!');
      }
      console.log(`   Registered ${statusCommands.length} commands`);
    }

    console.log('\n✅ All commands registered successfully!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();