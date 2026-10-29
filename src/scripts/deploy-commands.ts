import {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
} from 'discord.js';
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
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild)
  .addChannelOption((option) =>
    option.setName('channel')
      .setDescription('Text channel for status updates')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

const statusBots = [
  { name: 'Arctic Edge', tokenEnv: 'DISCORD_TOKEN_AE' },
  { name: 'Apocalypse', tokenEnv: 'DISCORD_TOKEN_APOC' },
  { name: 'Pacific Rift', tokenEnv: 'DISCORD_TOKEN_PR' },
  { name: 'Monument Valley', tokenEnv: 'DISCORD_TOKEN_MV' },
];

/**
 * Register commands for the application that owns the given token.
 * Each bot is its own Discord application, so the application ID is looked up from the token.
 */
async function registerCommands(label: string, token: string, commands: Array<{ toJSON(): unknown }>, guildId?: string) {
  const rest = new REST({ version: '10' }).setToken(token);
  const application = (await rest.get(Routes.currentApplication())) as { id: string };
  const route = guildId
    ? Routes.applicationGuildCommands(application.id, guildId)
    : Routes.applicationCommands(application.id);

  console.log(`🚀 Registering ${label} commands${guildId ? ` to guild ${guildId} (development mode)` : ' globally'}...`);
  await rest.put(route, { body: commands.map((cmd) => cmd.toJSON()) });
  console.log(`✅ ${label}: registered ${commands.length} command(s)`);
}

async function deployCommands() {
  const guildId = process.env.DISCORD_GUILD_ID || undefined;
  const helperToken = process.env.DISCORD_TOKEN_HELPER;
  const configuredStatusBots = statusBots.filter((bot) => process.env[bot.tokenEnv]);

  if (!helperToken && configuredStatusBots.length === 0) {
    console.error('Error: At least one DISCORD_TOKEN_* environment variable is required');
    process.exit(1);
  }

  try {
    if (helperToken) {
      await registerCommands('Helper', helperToken, helperCommands, guildId);
    }

    for (const bot of configuredStatusBots) {
      await registerCommands(bot.name, process.env[bot.tokenEnv]!, [setupCommand], guildId);
    }

    console.log('\n✅ All commands registered successfully!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  }
}

deployCommands();
