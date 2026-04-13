import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  Events,
  ActivityType,
} from 'discord.js';
import { helperConfig } from './config';
import { DataCollector } from './data-collector';
import { CommandHandlers } from './command-handlers';
import { ChartGenerator } from './chart-generator';
import { Logger, runMigration } from '../../utils';
import { AEApiHandler } from '../motorstorm-ae/api-handler';
import { ApocApiHandler } from '../motorstorm-apoc/api-handler';
import { PRApiHandler } from '../motorstorm-pr/api-handler';
import { MVApiHandler } from '../motorstorm-mv/api-handler';

export class HelperBot {
  private client: Client;
  private logger: Logger;
  private dataCollector: DataCollector;
  private commandHandlers: CommandHandlers;
  private chartGenerator: ChartGenerator;
  private aeApi: AEApiHandler;
  private apocApi: ApocApiHandler;
  private prApi: PRApiHandler;
  private mvApi: MVApiHandler;
  private collectionTimer?: NodeJS.Timeout;
  private activityRotationTimer?: NodeJS.Timeout;
  private activityIndex: number = 0;
  private commandCooldowns: Map<string, number> = new Map();
  private readonly COMMAND_COOLDOWN_MS = 2000;
  private activities = [
    { name: 'player statistics', type: ActivityType.Watching },
    { name: 'server analytics', type: ActivityType.Watching },
    { name: 'activity trends', type: ActivityType.Watching },
    { name: 'Use /help for commands', type: ActivityType.Listening },
    { name: 'peak times analysis', type: ActivityType.Watching },
    { name: 'game distribution data', type: ActivityType.Watching },
    { name: 'top player rankings', type: ActivityType.Watching },
  ];

  constructor() {
    this.logger = new Logger('MotorStorm-Helper');
    this.dataCollector = new DataCollector();
    this.chartGenerator = new ChartGenerator();

    this.aeApi = new AEApiHandler();
    this.apocApi = new ApocApiHandler();
    this.prApi = new PRApiHandler();
    this.mvApi = new MVApiHandler();

    this.commandHandlers = new CommandHandlers(
      this.dataCollector,
      this.chartGenerator,
      this.aeApi,
      this.apocApi,
      this.prApi,
      this.mvApi,
      this.logger
    );

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

    await runMigration();
    await this.dataCollector.init();
    this.startDataCollection();

    this.logger.info('ℹ️  Run "npm run deploy" to register slash commands');
    this.logger.info('    Or set DISCORD_GUILD_ID for development mode');

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

  private startDataCollection(): void {
    this.collectData();
    this.collectionTimer = setInterval(() => {
      this.collectData();
    }, 300000); // 5 minutes
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

      await this.dataCollector.recordSnapshot(
        { players: ae.general_lobby.players, lobbies: ae.lobbies.length, lobbyList: ae.lobbies },
        { players: apoc.general_lobby.players, lobbies: apoc.lobbies.length, lobbyList: apoc.lobbies },
        { players: pr.general_lobby.players, lobbies: pr.lobbies.length, lobbyList: pr.lobbies },
        { players: mv.general_lobby.players, lobbies: mv.lobbies.length, lobbyList: mv.lobbies }
      );

      this.logger.success('Data collection completed');
    } catch (error) {
      this.logger.error('Failed to collect data:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleInteraction(interaction: any): Promise<void> {
    if (!interaction.isCommand()) return;

    const command = interaction as ChatInputCommandInteraction;
    const userId = interaction.user.id;
    const now = Date.now();

    const lastCommand = this.commandCooldowns.get(userId);
    if (lastCommand && now - lastCommand < this.COMMAND_COOLDOWN_MS) {
      await command.reply({ content: '⏳ Please wait a moment before using another command.', ephemeral: true });
      return;
    }

    this.commandCooldowns.set(userId, now);

    try {
      await command.deferReply();

      const commandTimeout = setTimeout(async () => {
        try {
          await command.editReply('⏱️ Command is taking longer than expected... Still processing...');
        } catch (err) {
        }
      }, 10000);

      switch (command.commandName) {
        case 'help': await this.commandHandlers.handleHelpCommand(command); break;
        case 'dns': await this.commandHandlers.handleDNSCommand(command); break;
        case 'activity': await this.commandHandlers.handleActivityCommand(command); break;
        case 'peaktimes': await this.commandHandlers.handlePeakTimesCommand(command); break;
        case 'weekdays': await this.commandHandlers.handleWeekdaysCommand(command); break;
        case 'gamedist': await this.commandHandlers.handleGameDistCommand(command); break;
        case 'playerstats': await this.commandHandlers.handlePlayerStatsCommand(command); break;
        case 'topplayers': await this.commandHandlers.handleTopPlayersCommand(command); break;
        case 'leaderboard': await this.commandHandlers.handleLeaderboardCommand(command); break;
        case 'lobbies': await this.commandHandlers.handleLobbiesCommand(command); break;
        case 'sessions': await this.commandHandlers.handleSessionsCommand(command); break;
        case 'retention': await this.commandHandlers.handleRetentionCommand(command); break;
        case 'growth': await this.commandHandlers.handleGrowthCommand(command); break;
        case 'predict': await this.commandHandlers.handlePredictCommand(command); break;
        case 'current': await this.commandHandlers.handleCurrentCommand(command); break;
        case 'averages': await this.commandHandlers.handleAveragesCommand(command); break;
        case 'random': await this.commandHandlers.handleRandomMapCommand(command); break;
      }

      clearTimeout(commandTimeout);
    } catch (error) {
      this.logger.error('Command error:', error instanceof Error ? error : new Error(String(error)));
      try {
        await command.editReply('❌ An error occurred while processing your command. Please try again.');
      } catch (editError) {
        this.logger.error('Failed to edit reply:', editError instanceof Error ? editError : new Error(String(editError)));
      }
    }
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
    if (this.collectionTimer) clearInterval(this.collectionTimer);
    if (this.activityRotationTimer) clearInterval(this.activityRotationTimer);
    this.dataCollector.saveData();
    this.client.destroy();
    this.logger.success('Bot stopped');
  }
}
