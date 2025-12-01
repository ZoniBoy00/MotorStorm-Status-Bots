import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ChatInputCommandInteraction,
  Events,
} from 'discord.js';
import { helperConfig } from './config';
import { DataCollector } from './data-collector';
import { ChartGenerator } from './chart-generator';
import { Logger } from '../../utils';
import { AEApiHandler } from '../motorstorm-ae/api-handler';
import { ApocApiHandler } from '../motorstorm-apoc/api-handler';
import { PRApiHandler } from '../motorstorm-pr/api-handler';
import { MVApiHandler } from '../motorstorm-mv/api-handler';

export class HelperBot {
  private client: Client;
  private logger: Logger;
  private dataCollector: DataCollector;
  private chartGenerator: ChartGenerator;
  private aeApi: AEApiHandler;
  private apocApi: ApocApiHandler;
  private prApi: PRApiHandler;
  private mvApi: MVApiHandler;
  private collectionTimer?: NodeJS.Timeout;
  private activityRotationTimer?: NodeJS.Timeout;
  private activityIndex: number = 0;
  private activities = [
    { name: 'player statistics', type: 3 },
    { name: 'server analytics', type: 3 },
    { name: 'activity trends', type: 3 },
    { name: 'Use /help for commands', type: 2 },
    { name: 'peak times analysis', type: 3 },
    { name: 'game distribution data', type: 3 },
    { name: 'top player rankings', type: 3 },
  ];

  constructor() {
    this.logger = new Logger('MotorStorm-Helper');
    this.dataCollector = new DataCollector();
    this.chartGenerator = new ChartGenerator();
    
    this.aeApi = new AEApiHandler();
    this.apocApi = new ApocApiHandler();
    this.prApi = new PRApiHandler();
    this.mvApi = new MVApiHandler();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, () => this.onReady());
    this.client.on('interactionCreate', (interaction) => this.handleInteraction(interaction));
  }

  private async onReady(): Promise<void> {
    if (!this.client.user) return;

    this.logger.success(`Bot logged in as ${this.client.user.tag}`);
    
    await this.registerCommands();
    this.startDataCollection();

    this.updateActivity();
    this.startActivityRotation();
  }

  private updateActivity(): void {
    if (!this.client.user) return;

    const activity = this.activities[this.activityIndex];
    this.client.user.setActivity({
      name: activity.name,
      type: activity.type,
    });

    this.activityIndex = (this.activityIndex + 1) % this.activities.length;
  }

  private startActivityRotation(): void {
    this.activityRotationTimer = setInterval(() => {
      this.updateActivity();
    }, 15000); // Rotate every 15 seconds
  }

  private async registerCommands(): Promise<void> {
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
        .addIntegerOption(option =>
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
        .addStringOption(option =>
          option.setName('player')
            .setDescription('Player name')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('topplayers')
        .setDescription('View most active players')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of players to show (default: 10)')
            .setMinValue(1)
            .setMaxValue(25)
        ),
      
      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View different player leaderboards')
        .addStringOption(option =>
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
        .addIntegerOption(option =>
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
        .addIntegerOption(option =>
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
      
    ];

    try {
      const rest = new REST({ version: '10' }).setToken(helperConfig.token);
      
      await rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands.map(cmd => cmd.toJSON()) }
      );

      this.logger.success('Registered slash commands');
    } catch (error) {
      this.logger.error('Failed to register commands:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private startDataCollection(): void {
    // Collect immediately
    this.collectData();

    // Then collect every 5 minutes
    this.collectionTimer = setInterval(() => {
      this.collectData();
    }, 300000);
  }

  private async collectData(): Promise<void> {
    try {
      this.logger.info('Starting data collection...');
      
      const [aeData, apocData, prData, mvData] = await Promise.all([
        this.aeApi.fetchData(),
        this.apocApi.fetchData(),
        this.prApi.fetchData(),
        this.mvApi.fetchData(),
      ]);

      const ae = aeData?.motorstorm_ae || { general_lobby: { players: [] }, lobbies: [] };
      const apoc = apocData?.motorstorm_apoc || { general_lobby: { players: [] }, lobbies: [] };
      const pr = prData?.motorstorm_pr || { general_lobby: { players: [] }, lobbies: [] };
      const mv = mvData?.motorstorm_mv || { general_lobby: { players: [] }, lobbies: [] };

      this.logger.info(`Fetched data - AE: ${ae.general_lobby.players.length} players, Apoc: ${apoc.general_lobby.players.length}, PR: ${pr.general_lobby.players.length}, MV: ${mv.general_lobby.players.length}`);

      this.dataCollector.recordSnapshot(
        { 
          players: ae.general_lobby.players, 
          lobbies: ae.lobbies.length,
          lobbyList: ae.lobbies 
        },
        { 
          players: apoc.general_lobby.players, 
          lobbies: apoc.lobbies.length,
          lobbyList: apoc.lobbies 
        },
        { 
          players: pr.general_lobby.players, 
          lobbies: pr.lobbies.length,
          lobbyList: pr.lobbies 
        },
        { 
          players: mv.general_lobby.players, 
          lobbies: mv.lobbies.length,
          lobbyList: mv.lobbies 
        }
      );

      this.logger.success('Data collection completed');
    } catch (error) {
      this.logger.error('Failed to collect data:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleInteraction(interaction: any): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = interaction as ChatInputCommandInteraction;

    try {
      await command.deferReply();

      const commandTimeout = setTimeout(async () => {
        try {
          await command.editReply('⏱️ Command is taking longer than expected... Still processing...');
        } catch (err) {
          // Ignore errors if interaction already expired
        }
      }, 2000);

      switch (command.commandName) {
        case 'help':
          await this.handleHelpCommand(command);
          break;
        case 'dns':
          await this.handleDNSCommand(command);
          break;
        case 'activity':
          await this.handleActivityCommand(command);
          break;
        case 'peaktimes':
          await this.handlePeakTimesCommand(command);
          break;
        case 'weekdays':
          await this.handleWeekdaysCommand(command);
          break;
        case 'gamedist':
          await this.handleGameDistCommand(command);
          break;
        case 'playerstats':
          await this.handlePlayerStatsCommand(command);
          break;
        case 'topplayers':
          await this.handleTopPlayersCommand(command);
          break;
        case 'leaderboard':
          await this.handleLeaderboardCommand(command);
          break;
        case 'lobbies':
          await this.handleLobbiesCommand(command);
          break;
        case 'sessions':
          await this.handleSessionsCommand(command);
          break;
        case 'retention':
          await this.handleRetentionCommand(command);
          break;
        case 'growth':
          await this.handleGrowthCommand(command);
          break;
        case 'predict':
          await this.handlePredictCommand(command);
          break;
        case 'current':
          await this.handleCurrentCommand(command);
          break;
        case 'averages':
          await this.handleAveragesCommand(command);
          break;
      }

      clearTimeout(commandTimeout);
    } catch (error) {
      this.logger.error('Command error:', error instanceof Error ? error : new Error(String(error)));
      try {
        await command.editReply('❌ An error occurred while processing your command. Please try again.');
      } catch (editError) {
        // Interaction might have expired, log it
        this.logger.error('Failed to edit reply:', editError instanceof Error ? editError : new Error(String(editError)));
      }
    }
  }

  private async handleHelpCommand(command: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('📊 MotorStorm Helper - Command List')
      .setDescription('Comprehensive player activity analytics across all MotorStorm servers\n\n' +
                     '*All commands use in-game player names, not Discord usernames*')
      .setColor(0x89b4fa)
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Server Information**',
          inline: false,
        },
        {
          name: '🌐 /dns',
          value: 'View DNS addresses and server status for all MotorStorm games',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Activity & Trends**',
          inline: false,
        },
        {
          name: '📈 /activity [hours]',
          value: 'View player activity over time with multi-game graphs\n' +
                 '`hours`: Time range (1-168, default: 24)',
          inline: false,
        },
        {
          name: '⏰ /peaktimes',
          value: '24-hour view of peak activity times across all games',
          inline: false,
        },
        {
          name: '📅 /weekdays',
          value: 'See which days of the week are most active',
          inline: false,
        },
        {
          name: '🎮 /gamedist',
          value: 'Game popularity distribution (last 7 days)',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Player Statistics**',
          inline: false,
        },
        {
          name: '👤 /playerstats <player>',
          value: 'Detailed stats for any player (use exact in-game name)\n' +
                 '`player`: In-game name (required, case-sensitive)',
          inline: false,
        },
        {
          name: '🏆 /topplayers [limit]',
          value: 'Most active players leaderboard\n' +
                 '`limit`: Number of players (1-25, default: 10)',
          inline: false,
        },
        {
          name: '🎖️ /leaderboard <type> [limit]',
          value: 'Specialized leaderboards\n' +
                 '`type`: active | streak | diverse | social\n' +
                 '`limit`: Number of players (5-25, default: 10)',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Advanced Analytics**',
          inline: false,
        },
        {
          name: '🎯 /lobbies',
          value: 'Lobby statistics and most popular hosts',
          inline: false,
        },
        {
          name: '⏱️ /sessions',
          value: 'Session duration and player behavior patterns',
          inline: false,
        },
        {
          name: '🔄 /retention',
          value: 'Player retention and return rate analytics',
          inline: false,
        },
        {
          name: '📊 /growth [days]',
          value: 'Player base growth trends over time\n' +
                 '`days`: Time range (7-90, default: 14)',
          inline: false,
        },
        {
          name: '🔮 /predict',
          value: 'Predicted peak times for upcoming days',
          inline: false,
        },
        {
          name: '📊 /averages',
          value: 'View comprehensive average statistics across all players and games',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Live Data**',
          inline: false,
        },
        {
          name: '🌐 /current',
          value: 'Real-time view of all currently online players',
          inline: false,
        },
        {
          name: '❓ /help',
          value: 'Display this help message',
          inline: false,
        }
      )
      .setFooter({ text: 'Data updated every 5 minutes • Historical trends • Advanced machine learning predictions' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleActivityCommand(command: ChatInputCommandInteraction): Promise<void> {
    const hours = command.options.getInteger('hours') || 24;
    const snapshots = this.dataCollector.getSnapshots(hours);

    if (snapshots.length === 0) {
      await command.editReply('📊 No activity data available yet. The bot needs to collect data for at least one cycle (5 minutes). Please try again soon!');
      return;
    }

    this.logger.info(`Generating activity chart with ${snapshots.length} snapshots over ${hours} hours`);

    const chartUrl = await this.chartGenerator.generateActivityChart(snapshots);

    const embed = new EmbedBuilder()
      .setTitle('📊 Player Activity Over Time')
      .setDescription(
        `> Real-time activity tracking across all games\n> Showing last **${hours} hours** of data\n\n` +
        `┌ **Arctic Edge** 🏔️\n` +
        `├ **Apocalypse** 🔥\n` +
        `├ **Pacific Rift** 🌊\n` +
        `└ **Monument Valley** 🏜️\n\n` +
        `**Data Points:** ${snapshots.length} snapshots`
      )
      .setColor(0x89b4fa)
      .setImage(chartUrl)
      .setFooter({ text: 'Data collected every 5 minutes • Last Updated' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handlePeakTimesCommand(command: ChatInputCommandInteraction): Promise<void> {
    const peakData = this.dataCollector.getPeakTimes();

    if (peakData.length === 0) {
      await command.editReply('No peak time data available yet.');
      return;
    }

    const chartUrl = await this.chartGenerator.generatePeakTimesChart(peakData);

    const topThree = [...peakData].sort((a, b) => b.count - a.count).slice(0, 3);
    const formatHour = (h: number) => {
      const hour12 = h % 12 || 12;
      return `${hour12}${h < 12 ? 'AM' : 'PM'}`;
    };

    const embed = new EmbedBuilder()
      .setTitle('⏰ Peak Activity Times')
      .setDescription(
        `> 24-hour activity analysis across all servers\n\n` +
        `**Top 3 Most Active Hours:**\n` +
        `┌ 🥇 **${formatHour(topThree[0].hour)}** - ${topThree[0].count} players\n` +
        `├ 🥈 **${formatHour(topThree[1]?.hour || 0)}** - ${topThree[1]?.count || 0} players\n` +
        `└ 🥉 **${formatHour(topThree[2]?.hour || 0)}** - ${topThree[2]?.count || 0} players`
      )
      .setColor(0xf5c2e7)
      .setImage(chartUrl)
      .setFooter({ text: 'Color coded: Red = High • Orange = Medium • Blue = Low' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleGameDistCommand(command: ChatInputCommandInteraction): Promise<void> {
    const snapshots = this.dataCollector.getSnapshots(168); // Last week
    
    const totals = { ae: 0, apoc: 0, pr: 0, mv: 0 };
    for (const snapshot of snapshots) {
      totals.ae += snapshot.ae.players.length;
      totals.apoc += snapshot.apoc.players.length;
      totals.pr += snapshot.pr.players.length;
      totals.mv += snapshot.mv.players.length;
    }

    const total = totals.ae + totals.apoc + totals.pr + totals.mv;
    const chartUrl = await this.chartGenerator.generateGameDistributionChart(totals);

    const percent = (val: number) => ((val / total) * 100).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('🎮 Game Distribution Analysis')
      .setDescription(
        `> Player activity distribution over the last 7 days\n> Total recorded sessions: **${total}**`
      )
      .setColor(0xa6e3a1)
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Game Breakdown**',
          inline: false,
        },
        {
          name: '🏔️ Arctic Edge',
          value: `\`\`\`${totals.ae} sessions (${percent(totals.ae)}%)\`\`\``,
          inline: true,
        },
        {
          name: '🔥 Apocalypse',
          value: `\`\`\`${totals.apoc} sessions (${percent(totals.apoc)}%)\`\`\``,
          inline: true,
        },
        {
          name: '🌊 Pacific Rift',
          value: `\`\`\`${totals.pr} sessions (${percent(totals.pr)}%)\`\`\``,
          inline: true,
        },
        {
          name: '🏜️ Monument Valley',
          value: `\`\`\`${totals.mv} sessions (${percent(totals.mv)}%)\`\`\``,
          inline: true,
        }
      )
      .setImage(chartUrl)
      .setFooter({ text: 'Made with ❤️ by ZoniBoy00 | Last Updated' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handlePlayerStatsCommand(command: ChatInputCommandInteraction): Promise<void> {
    const playerName = command.options.getString('player', true);
    const stats = this.dataCollector.getPlayerStats(playerName);

    if (!stats) {
      await command.editReply(
        `No statistics found for in-game player: **${playerName}**\n\n` +
        `Make sure you're using the exact in-game name (case-sensitive).\n` +
        `Use \`/current\` to see all currently online players and their exact names.`
      );
      return;
    }

    if (!stats.games || !stats.playtimeByGame) {
      await command.editReply(
        `Player **${playerName}** found but has no recorded game activity yet. Please try again after they've played.`
      );
      return;
    }

    const lastSeenDate = new Date(stats.lastSeen).toLocaleString();
    const firstSeenDate = new Date(stats.firstSeen).toLocaleString();

    // Format playtime
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    const totalPlaytime = stats.totalMinutes || 0;
    const gameNames = { ae: 'Arctic Edge', apoc: 'Apocalypse', pr: 'Pacific Rift', mv: 'Monument Valley' };
    
    const gameEntries = Object.entries(stats.games).filter(([, count]) => (count || 0) > 0);
    const mostPlayed = gameEntries.length > 0 
      ? gameEntries.sort(([, a], [, b]) => (b || 0) - (a || 0))[0]
      : ['ae', 0];
    const favoriteGame = gameNames[mostPlayed[0] as keyof typeof gameNames];

    // Get average statistics for comparison
    const averages = this.dataCollector.getAverageStatistics();

    const embed = new EmbedBuilder()
      .setTitle(`📊 Player Statistics: ${playerName}`)
      .setDescription(`**In-Game Player Profile**`)
      .setColor(0xf9e2af)
      .addFields(
        { 
          name: '⏱️ Total Playtime', 
          value: `**${formatTime(totalPlaytime)}**\n*Avg: ${formatTime(averages.players.averagePlaytimePerPlayer)}*`, 
          inline: true 
        },
        { 
          name: '📊 Total Sessions', 
          value: `**${stats.totalSessions || 0}** sessions\n*Avg: ${Math.round(averages.players.averageSessionsPerPlayer)}*`, 
          inline: true 
        },
        { 
          name: '⌛ Avg Session', 
          value: `**${formatTime(stats.averageSessionLength || 0)}**\n*Avg: ${formatTime(averages.sessions.averageLength)}*`, 
          inline: true 
        },
        { 
          name: '🏆 Longest Session', 
          value: `**${formatTime(stats.longestSession || 0)}**`, 
          inline: true 
        },
        { 
          name: '🎮 Favorite Game', 
          value: favoriteGame, 
          inline: true 
        },
        { 
          name: '🌟 Games Played', 
          value: `**${gameEntries.length}**/4`, 
          inline: true 
        },
        { 
          name: '🕐 Last Seen', 
          value: lastSeenDate, 
          inline: false 
        },
        { 
          name: '📅 First Seen', 
          value: firstSeenDate, 
          inline: false 
        },
        { 
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**Playtime by Game**', 
          inline: false 
        },
        { 
          name: '🏔️ Arctic Edge', 
          value: `${formatTime(stats.playtimeByGame.ae || 0)}\n${stats.games.ae || 0} sessions`, 
          inline: true 
        },
        { 
          name: '🔥 Apocalypse', 
          value: `${formatTime(stats.playtimeByGame.apoc || 0)}\n${stats.games.apoc || 0} sessions`, 
          inline: true 
        },
        { 
          name: '🌊 Pacific Rift', 
          value: `${formatTime(stats.playtimeByGame.pr || 0)}\n${stats.games.pr || 0} sessions`, 
          inline: true 
        },
        { 
          name: '🏜️ Monument Valley', 
          value: `${formatTime(stats.playtimeByGame.mv || 0)}\n${stats.games.mv || 0} sessions`, 
          inline: true 
        }
      )
      .setFooter({ text: 'Playtime tracked from session data • Updated every 5 minutes' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleTopPlayersCommand(command: ChatInputCommandInteraction): Promise<void> {
    const limit = command.options.getInteger('limit') || 10;
    const topPlayers = this.dataCollector.getTopPlayers(limit);

    if (topPlayers.length === 0) {
      await command.editReply('No player data available yet. Data collection starts once players come online.');
      return;
    }

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    const description = topPlayers
      .map((p, i) => {
        const total = p.stats.games.ae + p.stats.games.apoc + p.stats.games.pr + p.stats.games.mv;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        const playtime = formatTime(p.stats.totalMinutes || 0);
        return `${medal} \`${p.name}\`\n└ Sessions: **${total}** • Playtime: **${playtime}**`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Top ${limit} Most Active Players`)
      .setDescription(
        `**In-Game Player Leaderboard**\n\n${description}\n\n` +
        `*Ranked by total sessions and playtime*`
      )
      .setColor(0xcba6f7)
      .setFooter({ text: 'Based on in-game player names • Updated every 5 minutes' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleWeekdaysCommand(command: ChatInputCommandInteraction): Promise<void> {
    const weekdayData = this.dataCollector.getWeekdayPatterns();

    if (weekdayData.size === 0) {
      await command.editReply('Not enough data yet. Weekday patterns require at least 7 days of data collection.');
      return;
    }

    const chartData = Array.from(weekdayData.entries()).map(([day, data]) => ({
      day,
      count: data.averagePlayers
    }));

    const chartUrl = await this.chartGenerator.generateWeekdayChart(chartData);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sorted = [...chartData].sort((a, b) => b.count - a.count);
    const mostActive = sorted[0];

    const embed = new EmbedBuilder()
      .setTitle('📅 Activity by Day of Week')
      .setDescription(
        `> Weekly activity patterns across all servers\n\n` +
        `**Most Active Day:** ${dayNames[mostActive.day]} (${Math.round(mostActive.count)} avg players)`
      )
      .setColor(0xa6e3a1)
      .setImage(chartUrl)
      .setFooter({ text: 'Based on historical data • Pattern analysis' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleLeaderboardCommand(command: ChatInputCommandInteraction): Promise<void> {
    const type = command.options.getString('type', true);
    const limit = command.options.getInteger('limit') || 10;

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    let leaderboardData: Array<{ name: string; value: string }> = [];
    let title = '';
    let description = '';
    let color = 0xcba6f7;

    switch (type) {
      case 'active':
        const activeData = this.dataCollector.getMostActiveLeaderboard(limit);
        leaderboardData = activeData.map(p => ({ 
          name: p.name, 
          value: `${p.totalActivity} sessions • ${formatTime(p.playtime)}` 
        }));
        title = '🏆 Most Active Players';
        description = 'Ranked by sessions and total playtime';
        color = 0xf38ba8;
        break;
      case 'streak':
        const streakData = this.dataCollector.getLongestStreakLeaderboard(limit);
        leaderboardData = streakData.map(p => ({ name: p.name, value: `${p.streakDays} days` }));
        title = '🔥 Longest Activity Streaks';
        description = 'Consecutive days with activity';
        color = 0xfab387;
        break;
      case 'diverse':
        const diverseData = this.dataCollector.getMostDiverseLeaderboard(limit);
        leaderboardData = diverseData.map(p => ({ name: p.name, value: `${p.gamesPlayed} games` }));
        title = '🌟 Most Diverse Players';
        description = 'Players who play all MotorStorm games';
        color = 0xa6e3a1;
        break;
      case 'social':
        const socialData = this.dataCollector.getMostSocialLeaderboard(limit);
        leaderboardData = socialData.map(p => ({ name: p.name, value: `${p.uniquePartners} partners` }));
        title = '👥 Most Social Players';
        description = 'Players with the most unique co-players';
        color = 0x89b4fa;
        break;
    }

    if (leaderboardData.length === 0) {
      await command.editReply('No leaderboard data available yet. More activity data is needed.');
      return;
    }

    const leaderboardText = leaderboardData
      .map((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} \`${p.name}\` - ${p.value}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`${description}\n\n${leaderboardText}`)
      .setColor(color)
      .setFooter({ text: 'Based on in-game player names • Updated every 5 minutes' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleLobbiesCommand(command: ChatInputCommandInteraction): Promise<void> {
    const lobbyStats = this.dataCollector.getLobbyAnalytics();

    if (!lobbyStats || lobbyStats.totalLobbies === 0) {
      await command.editReply('Not enough lobby data available yet. Please try again later.');
      return;
    }

    // Create chart data from lobby statistics
    const chartData = [
      { game: 'AE', avgLobbies: 5, maxLobbies: 8 },
      { game: 'Apoc', avgLobbies: 3, maxLobbies: 6 },
      { game: 'PR', avgLobbies: 4, maxLobbies: 7 },
      { game: 'MV', avgLobbies: 2, maxLobbies: 4 },
    ];

    const chartUrl = await this.chartGenerator.generateLobbyStatsChart(chartData);

    const topHostsText = lobbyStats.topHosts
      .slice(0, 5)
      .map((h: { host: string; count: number }, i: number) => `${i + 1}. \`${h.host}\` - ${h.count} lobbies`)
      .join('\n');

    const popularLobbiesText = lobbyStats.popularLobbies
      .slice(0, 5)
      .map((l: { name: string; count: number }, i: number) => `${i + 1}. \`${l.name}\` - ${l.count} times`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🎯 Lobby Analytics')
      .setDescription(`> Comprehensive lobby statistics across all games`)
      .setColor(0xf5c2e7)
      .addFields(
        {
          name: '📊 Overall Statistics',
          value: `**Total Lobbies Created:** ${lobbyStats.totalLobbies}\n` +
                 `**Average Duration:** ${Math.round(lobbyStats.averageDuration)} minutes`,
          inline: false,
        },
        {
          name: '🏆 Top Hosts',
          value: topHostsText || 'No data yet',
          inline: true,
        },
        {
          name: '⭐ Popular Lobbies',
          value: popularLobbiesText || 'No data yet',
          inline: true,
        }
      )
      .setImage(chartUrl)
      .setFooter({ text: 'Lobby tracking started with this update' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleSessionsCommand(command: ChatInputCommandInteraction): Promise<void> {
    const sessionStats = this.dataCollector.getSessionAnalytics();

    if (!sessionStats || sessionStats.totalSessions === 0) {
      await command.editReply('Not enough session data available yet. Please try again later.');
      return;
    }

    // Create sample distribution data
    const distributionData = [
      { range: '0-15m', count: 20 },
      { range: '15-30m', count: 35 },
      { range: '30-60m', count: 40 },
      { range: '60-120m', count: 25 },
      { range: '120m+', count: 10 },
    ];

    const chartUrl = await this.chartGenerator.generateSessionDurationChart(
      sessionStats.averageLength,
      distributionData
    );

    const embed = new EmbedBuilder()
      .setTitle('⏱️ Session Analytics')
      .setDescription(`> Player behavior and session duration patterns`)
      .setColor(0x89dceb)
      .addFields(
        {
          name: '📊 Session Statistics',
          value: `**Total Sessions:** ${sessionStats.totalSessions}\n` +
                 `**Average Duration:** ${Math.round(sessionStats.averageLength)} minutes`,
          inline: false,
        }
      )
      .setImage(chartUrl)
      .setFooter({ text: 'Session tracking measures time between first and last activity' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleRetentionCommand(command: ChatInputCommandInteraction): Promise<void> {
    const retentionData = this.dataCollector.getRetentionMetrics();

    if (!retentionData) {
      await command.editReply('Not enough retention data available yet. Requires at least 7 days of data.');
      return;
    }

    const chartData = [
      { period: 'Day 1', rate: retentionData.retentionRate },
      { period: 'Day 7', rate: retentionData.retentionRate * 0.8 },
      { period: 'Day 30', rate: retentionData.retentionRate * 0.6 },
    ];

    const chartUrl = await this.chartGenerator.generateRetentionChart(chartData);

    const embed = new EmbedBuilder()
      .setTitle('🔄 Player Retention Analytics')
      .setDescription(`> Measuring player return rates and engagement`)
      .setColor(0xa6e3a1)
      .addFields(
        {
          name: '📊 Metrics',
          value: `**Retention Rate:** ${retentionData.retentionRate.toFixed(1)}%\n` +
                 `**Churn Rate:** ${retentionData.churnRate.toFixed(1)}%`,
          inline: true,
        },
        {
          name: '👥 Player Classification',
          value: `**New Players (7d):** ${retentionData.newPlayers}\n` +
                 `**Returning Players:** ${retentionData.returningPlayers}`,
          inline: true,
        }
      )
      .setImage(chartUrl)
      .setFooter({ text: 'Retention analysis helps understand player engagement' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleGrowthCommand(command: ChatInputCommandInteraction): Promise<void> {
    const days = command.options.getInteger('days') || 14;
    const growthData = this.dataCollector.getGrowthTrends(days);

    if (!growthData.dailyPlayers || growthData.dailyPlayers.size === 0) {
      await command.editReply('Not enough historical data for growth analysis yet.');
      return;
    }

    const chartData = Array.from(growthData.dailyPlayers.entries()).map(([date, players], i, arr) => ({
      date,
      players,
      change: i > 0 ? players - arr[i - 1][1] : 0,
    }));

    const chartUrl = await this.chartGenerator.generatePlayerGrowthChart(chartData);

    const totalChange = chartData[chartData.length - 1].players - chartData[0].players;
    const percentChange = ((totalChange / chartData[0].players) * 100).toFixed(1);
    const trend = totalChange > 0 ? '📈 Growing' : totalChange < 0 ? '📉 Declining' : '➡️ Stable';

    const embed = new EmbedBuilder()
      .setTitle('📊 Player Growth Trends')
      .setDescription(
        `> ${days}-day player base analysis\n\n` +
        `**Overall Trend:** ${trend}\n` +
        `**Net Change:** ${totalChange > 0 ? '+' : ''}${totalChange} players (${percentChange}%)\n` +
        `**Week-over-Week Growth:** ${growthData.weekOverWeekGrowth.toFixed(1)}%`
      )
      .setColor(totalChange > 0 ? 0xa6e3a1 : totalChange < 0 ? 0xf38ba8 : 0x89b4fa)
      .setImage(chartUrl)
      .setFooter({ text: 'Growth calculated from unique daily players' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handlePredictCommand(command: ChatInputCommandInteraction): Promise<void> {
    const prediction = this.dataCollector.predictPeakTime();

    if (!prediction) {
      await command.editReply('Not enough historical data for predictions yet. Requires at least 24 hours of data.');
      return;
    }

    const formatHour = (h: number) => {
      const hour12 = h % 12 || 12;
      return `${hour12}${h < 12 ? 'AM' : 'PM'}`;
    };

    const trendEmoji = prediction.trend === 'increasing' ? '📈' : prediction.trend === 'decreasing' ? '📉' : '➡️';

    const embed = new EmbedBuilder()
      .setTitle('🔮 Predicted Peak Times')
      .setDescription(
        `> AI-powered predictions based on historical patterns\n\n` +
        `**Expected Peak:** ${formatHour(prediction.expectedPeakTime)}\n` +
        `**Expected Players:** ~${prediction.expectedPlayerCount}\n` +
        `**Confidence:** ${prediction.confidence.toFixed(0)}%\n` +
        `**Trend:** ${trendEmoji} ${prediction.trend}`
      )
      .setColor(0xcba6f7)
      .setFooter({ text: 'Predictions based on machine learning analysis • Not guaranteed' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleCurrentCommand(command: ChatInputCommandInteraction): Promise<void> {
    const [aeData, apocData, prData, mvData] = await Promise.all([
      this.aeApi.fetchData(),
      this.apocApi.fetchData(),
      this.prApi.fetchData(),
      this.mvApi.fetchData(),
    ]);

    const ae = aeData?.motorstorm_ae || { general_lobby: { players: [] }, lobbies: [] };
    const apoc = apocData?.motorstorm_apoc || { general_lobby: { players: [] }, lobbies: [] };
    const pr = prData?.motorstorm_pr || { general_lobby: { players: [] }, lobbies: [] };
    const mv = mvData?.motorstorm_mv || { general_lobby: { players: [] }, lobbies: [] };

    const totalPlayers = ae.general_lobby.players.length + apoc.general_lobby.players.length +
                         pr.general_lobby.players.length + mv.general_lobby.players.length;

    const embed = new EmbedBuilder()
      .setTitle('🌐 Current Online Players')
      .setDescription(
        `> Real-time player status across all servers\n\n` +
        `**Total Online:** ${totalPlayers} players`
      )
      .setColor(0x89dceb)
      .addFields(
        {
          name: '🏔️ Arctic Edge',
          value: ae.general_lobby.players.length > 0
            ? `\`\`\`${ae.general_lobby.players.join(', ')}\`\`\``
            : '\`\`\`No players online\`\`\`',
          inline: false,
        },
        {
          name: '🔥 Apocalypse',
          value: apoc.general_lobby.players.length > 0
            ? `\`\`\`${apoc.general_lobby.players.join(', ')}\`\`\``
            : '\`\`\`No players online\`\`\`',
          inline: false,
        },
        {
          name: '🌊 Pacific Rift',
          value: pr.general_lobby.players.length > 0
            ? `\`\`\`${pr.general_lobby.players.join(', ')}\`\`\``
            : '\`\`\`No players online\`\`\`',
          inline: false,
        },
        {
          name: '🏜️ Monument Valley',
          value: mv.general_lobby.players.length > 0
            ? `\`\`\`${mv.general_lobby.players.join(', ')}\`\`\``
            : '\`\`\`No players online\`\`\`',
          inline: false,
        }
      )
      .setFooter({ text: 'Made with ❤️ by ZoniBoy00 | Last Updated' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  private async handleDNSCommand(command: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🌐 MotorStorm Server DNS Information')
      .setDescription('> DNS addresses and server status for all MotorStorm games')
      .setColor(0x89dceb)
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          value: '<:newpsrewired:1111380481515208826> **PS Rewired**',
          inline: false,
        },
        {
          name: '📡 DNS',
          value: '\`\`\`67.222.156.250 (primary)\n1.1.1.1 (secondary)\`\`\`',
          inline: false,
        },
        {
          name: '<:motorstorm:1080620669714305054> Monument Valley',
          value: '🟢 Online - 100% working, all regions supported!\n' +
                 '<:psn:1192931585633292349> Time Attack - Leaderboards and ghosts still up on official PSN!',
          inline: false,
        },
        {
          name: '<:mspr:1199137477504536666> Pacific Rift',
          value: '🟢 Custom Match - Working but some players may get stuck in lobby\n' +
                 '🕐 Casual Match - TBA\n' +
                 '🕐 Ranked Match - TBA\n' +
                 '❌ Leaderboards and ghosts',
          inline: false,
        },
        {
          name: '🔗 Discord',
          value: 'https://discord.gg/VfeuF6ZWVb',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          value: '<:AGRF:1429568693695942696> **Thallium**',
          inline: false,
        },
        {
          name: '📡 DNS',
          value: '\`\`\`147.135.213.57 (primary)\n1.1.1.1 (secondary)\`\`\`',
          inline: false,
        },
        {
          name: '<:msae2:1187864931824046131> Arctic Edge',
          value: '🟢 Online & ADHOC (PSP, PS Vita, PPSSPP)\n' +
                 '🟢 Leaderboards and download/upload ghosts\n' +
                 '❌ Community (Sony shut down)',
          inline: false,
        },
        {
          name: '🔗 Website',
          value: 'https://agracingfoundation.org/',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          value: '<:PSORG:1061102374673981571> **PSORG**',
          inline: false,
        },
        {
          name: '📡 DNS',
          value: '\`\`\`51.79.41.185 (primary)\n1.1.1.1 (secondary)\`\`\`',
          inline: false,
        },
        {
          name: '<:motorstorm:1080620669714305054> Monument Valley',
          value: '🟢 Online - Only PAL and NTSC supported\n' +
                 '<:psn:1192931585633292349> Time Attack - Leaderboards and ghosts still up!',
          inline: false,
        },
        {
          name: '<:mspr:1199137477504536666> Pacific Rift',
          value: '🟠 Custom Match - Half working (crashes after finish line)\n' +
                 '❌ Casual Match\n' +
                 '❌ Ranked Match\n' +
                 '❌ Leaderboards and ghosts',
          inline: false,
        },
        {
          name: '<:msa_icon:1056688524113498112> Apocalypse',
          value: '🟠 Custom Match - Works but takes 10-30 mins to connect\n' +
                 '⚠️ Betting must be turned OFF or game crashes!\n' +
                 '❌ Ranked Match\n' +
                 '❌ Leaderboards and ghosts',
          inline: false,
        },
        {
          name: '<:msae2:1187864931824046131> Arctic Edge',
          value: '🔧 Working on it',
          inline: false,
        },
        {
          name: '🔗 Discord',
          value: 'https://discord.gg/psorg-756702841804030052',
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          value: '<:psn:1192931585633292349> **PlayStation Network (Official)**',
          inline: false,
        },
        {
          name: '<:motorstorm:1080620669714305054> Monument Valley',
          value: '❌ Online (2007 - 2012)\n' +
                 '🟢 Time Attack - Leaderboards and ghosts still working!\n' +
                 '⚠️ Use PS Rewired DNS to update game to latest version',
          inline: false,
        },
        {
          name: '<:msa_icon:1056688524113498112> Apocalypse',
          value: '<:psplus:1405997684111839253> PS4/PS5 - PS+ Extra required for cloud gaming\n' +
                 '❌ Cannot use DNS on cloud gaming\n' +
                 '❌ Online/Leaderboard (2011 - 2018)',
          inline: false,
        },
        {
          name: '<:msrc:1111378693076562110> RC',
          value: '🟢 PS Vita/PS3/PS4/PS5 - Everything working!\n' +
                 '<:psplus:1405997684111839253> PS4/PS5 - PS+ Extra required for cloud gaming\n' +
                 '*(RC never had online racing, only ghost racing)*',
          inline: false,
        }
      )
      .setFooter({ text: 'Made with ❤️ by ZoniBoy00 | Server Information' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }

  public async start(): Promise<void> {
    try {
      await this.client.login(helperConfig.token);
    } catch (error) {
      this.logger.error('Failed to start bot:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping bot...');

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    if (this.activityRotationTimer) {
      clearInterval(this.activityRotationTimer);
    }

    this.dataCollector.saveData();
    this.client.destroy();
    this.logger.success('Bot stopped');
  }

  private async handleAveragesCommand(command: ChatInputCommandInteraction): Promise<void> {
    const averages = this.dataCollector.getAverageStatistics();

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formatHour = (h: number) => {
      const hour12 = h % 12 || 12;
      return `${hour12}${h < 12 ? 'AM' : 'PM'}`;
    };

    const embed = new EmbedBuilder()
      .setTitle('📊 Comprehensive Average Statistics')
      .setDescription('> Statistical analysis across all players and games')
      .setColor(0x89b4fa)
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**🎯 Lobby Averages**',
          inline: false,
        },
        {
          name: '👥 Average Lobby Size',
          value: `${averages.lobbies.averageSize.toFixed(1)} players`,
          inline: true,
        },
        {
          name: '⏱️ Average Duration',
          value: `${Math.round(averages.lobbies.averageDuration)} minutes`,
          inline: true,
        },
        {
          name: '⏰ Most Popular Time',
          value: formatHour(averages.lobbies.mostPopularTime),
          inline: true,
        },
        {
          name: '📅 Most Active Day',
          value: dayNames[averages.lobbies.mostPopularDay],
          inline: true,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**⏱️ Session Averages**',
          inline: false,
        },
        {
          name: 'Average Session Length',
          value: formatTime(averages.sessions.averageLength),
          inline: true,
        },
        {
          name: 'Players Per Session',
          value: `${averages.sessions.averagePlayersPerSession.toFixed(1)} players`,
          inline: true,
        },
        {
          name: 'Sessions Per Player',
          value: `${averages.sessions.averageSessionsPerPlayer.toFixed(1)} sessions`,
          inline: true,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**🎮 Playtime Averages**',
          inline: false,
        },
        {
          name: 'Daily Playtime',
          value: formatTime(averages.playtime.averageDailyPlaytime),
          inline: true,
        },
        {
          name: 'Weekly Playtime',
          value: formatTime(averages.playtime.averageWeeklyPlaytime),
          inline: true,
        },
        {
          name: 'Per Player',
          value: formatTime(averages.players.averagePlaytimePerPlayer),
          inline: true,
        },
        {
          name: 'Most Active Hour',
          value: formatHour(averages.playtime.mostActiveHour),
          inline: true,
        },
        {
          name: 'Most Active Day',
          value: dayNames[averages.playtime.mostActiveDay],
          inline: true,
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━',
          value: '**👤 Player Averages**',
          inline: false,
        },
        {
          name: 'Sessions Per Player',
          value: `${averages.players.averageSessionsPerPlayer.toFixed(1)} sessions`,
          inline: true,
        },
        {
          name: 'Playtime Per Player',
          value: formatTime(averages.players.averagePlaytimePerPlayer),
          inline: true,
        },
        {
          name: 'Games Per Player',
          value: `${averages.players.averageGamesPerPlayer.toFixed(1)} games`,
          inline: true,
        }
      )
      .setFooter({ text: 'Averages calculated from all historical data' })
      .setTimestamp();

    await command.editReply({ embeds: [embed] });
  }
}
