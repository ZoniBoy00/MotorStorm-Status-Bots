import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const helperConfig = {
  token: process.env.DISCORD_TOKEN_HELPER || '',
};

const commands = [
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

async function deployCommands() {
  if (!helperConfig.token) {
    console.error('Error: DISCORD_TOKEN_HELPER environment variable is required');
    process.exit(1);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!clientId) {
    console.error('Error: DISCORD_CLIENT_ID environment variable is required');
    console.error('You can get this from the Discord Developer Portal');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(helperConfig.token);

  try {
    console.log('🚀 Registering slash commands...');

    if (guildId) {
      console.log(`   Deploying to guild: ${guildId} (development mode)`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      console.log('✅ Commands registered to guild successfully!');
    } else {
      console.log('   Deploying globally (may take up to 1 hour to propagate)');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands.map(cmd => cmd.toJSON()) }
      );
      console.log('✅ Commands registered globally successfully!');
    }

    console.log(`   Registered ${commands.length} commands`);
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();