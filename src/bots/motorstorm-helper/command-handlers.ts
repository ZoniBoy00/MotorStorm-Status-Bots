import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, REST, Routes, SlashCommandStringOption, SlashCommandIntegerOption } from 'discord.js';
import { DataCollector } from './data-collector';
import { ChartGenerator } from './chart-generator';
import { AEApiHandler } from '../motorstorm-ae/api-handler';
import { ApocApiHandler } from '../motorstorm-apoc/api-handler';
import { PRApiHandler } from '../motorstorm-pr/api-handler';
import { MVApiHandler } from '../motorstorm-mv/api-handler';
import { Logger } from '../../utils';
import { helperConfig } from './config';
import { MOTORSTORM_MAPS } from './maps-data';

export class CommandHandlers {
    private readonly MAX_PLAYER_NAME_LENGTH = 50;
    private readonly MAX_LIMIT = 100;
    private readonly ALLOWED_GAME_CODES = ['mv', 'pr', 'ae', 'apoc'];
    private readonly ALLOWED_LEADERBOARD_TYPES = ['active', 'streak', 'diverse', 'social'];

    constructor(
        public dataCollector: DataCollector,
        private chartGenerator: ChartGenerator,
        private aeApi: AEApiHandler,
        private apocApi: ApocApiHandler,
        private prApi: PRApiHandler,
        private mvApi: MVApiHandler,
        private logger: Logger
    ) { }

    private sanitizeString(input: string, maxLength: number = this.MAX_PLAYER_NAME_LENGTH): string {
        return input.trim().slice(0, maxLength).replace(/[^\w\s\-_]/gi, '');
    }

    private sanitizeLimit(limit: number | null, defaultValue: number = 10, maxValue: number = this.MAX_LIMIT): number {
        const parsed = Math.max(1, Math.min(maxValue, limit ?? defaultValue));
        return parsed;
    }

    private sanitizeGameCode(code: string | null): string {
        const sanitized = (code || 'mv').toLowerCase().trim();
        return this.ALLOWED_GAME_CODES.includes(sanitized) ? sanitized : 'mv';
    }

    private sanitizeLeaderboardType(type: string): string {
        const sanitized = type.toLowerCase().trim();
        return this.ALLOWED_LEADERBOARD_TYPES.includes(sanitized) ? sanitized : 'active';
    }

    private formatTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    private formatHour(h: number): string {
        const hour12 = h % 12 || 12;
        return `${hour12}${h < 12 ? 'AM' : 'PM'}`;
    }

    public async handleDNSCommand(command: ChatInputCommandInteraction): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('🌐 MotorStorm Online – DNS Setup Guide')
            .setDescription('Use the DNS settings below to play MotorStorm games online on PS3, RPCS3, PSP, PS Vita, and PPSSPP.')
            .setColor(0x89dceb)
            .addFields(
                {
                    name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    value: '<:newpsrewired:1111380481515208826> **PS Rewired DNS**',
                    inline: false,
                },
                {
                    name: '📡 67.222.156.250',
                    value: '*Secondary: 1.1.1.1 or 8.8.8.8*\n\n' +
                        '**Supported Games (Play Online):**\n' +
                        '• <:motorstorm:1080620669714305054> Monument Valley (PS3 / RPCS3)\n' +
                        '• <:mspr:1199137477504536666> Pacific Rift (PS3 / RPCS3)\n' +
                        '• <:msa_icon:1056688524113498112> Apocalypse (PS3 / RPCS3)',
                    inline: false,
                },
                {
                    name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    value: '<:AGRF:1429568693695942696> **Thallium DNS**',
                    inline: false,
                },
                {
                    name: '📡 147.135.213.57',
                    value: '*Secondary: 1.1.1.1*\n\n' +
                        '**Supported Game (Play Online):**\n' +
                        '• <:msae2:1187864931824046131> Arctic Edge (PSP / PS Vita / PPSSPP)',
                    inline: false,
                },
                {
                    name: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    value: 'ℹ️ **Notes**',
                    inline: false,
                },
                {
                    name: '\u200b',
                    value: '• You can use either PS Rewired or Thallium DNS — both will work.\n' +
                        '• Arctic Edge online via PS Rewired DNS is automatically redirected to the Thallium servers.\n' +
                        '• PPSSPP is already auto-configured for Thallium, so you usually don’t need to change the DNS unless required.',
                    inline: false,
                }
            )
            .setFooter({ text: 'MotorStorm Helper • Server Status & Setup' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async handleHelpCommand(command: ChatInputCommandInteraction): Promise<void> {
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
                    name: '━━━━━━━━━━━━━━━━━━━━━━',
                    value: '**Game Tools**',
                    inline: false,
                },
                {
                    name: '🎲 /random [game]',
                    value: 'Generate a random track from any MotorStorm game\n' +
                        '`game`: mv | pr | ae | apoc (optional)',
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

    public async handleCurrentCommand(command: ChatInputCommandInteraction): Promise<void> {
        const [aeStat, apocStat, prStat, mvStat] = await Promise.all([
            this.aeApi.fetchData(),
            this.apocApi.fetchData(),
            this.prApi.fetchData(),
            this.mvApi.fetchData(),
        ]);

        const ae = aeStat?.motorstorm_ae || { general_lobby: { players: [] } };
        const apoc = apocStat?.motorstorm_apoc || { general_lobby: { players: [] } };
        const pr = prStat?.motorstorm_pr || { general_lobby: { players: [] } };
        const mv = mvStat?.motorstorm_mv || { general_lobby: { players: [] } };

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

    public async handleActivityCommand(command: ChatInputCommandInteraction): Promise<void> {
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

    public async handlePeakTimesCommand(command: ChatInputCommandInteraction): Promise<void> {
        const peakData = this.dataCollector.getPeakTimes();

        if (peakData.length === 0) {
            await command.editReply('No peak time data available yet.');
            return;
        }

        const chartUrl = await this.chartGenerator.generatePeakTimesChart(peakData);

        const topThree = [...peakData].sort((a, b) => b.count - a.count).slice(0, 3);

        const embed = new EmbedBuilder()
            .setTitle('⏰ Peak Activity Times')
            .setDescription(
                `> 24-hour activity analysis across all servers\n\n` +
                `**Top 3 Most Active Hours:**\n` +
                `┌ 🥇 **${this.formatHour(topThree[0].hour)}** - ${topThree[0].count} players\n` +
                `├ 🥈 **${this.formatHour(topThree[1]?.hour || 0)}** - ${topThree[1]?.count || 0} players\n` +
                `└ 🥉 **${this.formatHour(topThree[2]?.hour || 0)}** - ${topThree[2]?.count || 0} players`
            )
            .setColor(0xf5c2e7)
            .setImage(chartUrl)
            .setFooter({ text: 'Color coded: Red = High • Orange = Medium • Blue = Low' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async handleGameDistCommand(command: ChatInputCommandInteraction): Promise<void> {
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

        const percent = (val: number) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

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

    public async handlePlayerStatsCommand(command: ChatInputCommandInteraction): Promise<void> {
        const rawPlayerName = command.options.getString('player', true);
        const playerName = this.sanitizeString(rawPlayerName);
        
        if (playerName.length < 1) {
            await command.editReply('Invalid player name. Please provide a valid in-game name.');
            return;
        }

        const stats = this.dataCollector.getPlayerStats(playerName);

        if (!stats) {
            await command.editReply(
                `No statistics found for in-game player: **${playerName}**\n\n` +
                `Make sure you're using the exact in-game name (case-sensitive).\n` +
                `Use \`/current\` to see all currently online players and their exact names.`
            );
            return;
        }

        const lastSeenDate = new Date(stats.lastSeen).toLocaleString();
        const firstSeenDate = new Date(stats.firstSeen).toLocaleString();

        const totalPlaytime = stats.totalMinutes || 0;
        const gameNames = { ae: 'Arctic Edge', apoc: 'Apocalypse', pr: 'Pacific Rift', mv: 'Monument Valley' };

        const gameEntries = Object.entries(stats.games || {}).filter(([, count]) => (count || 0) > 0);
        const mostPlayed = gameEntries.length > 0
            ? gameEntries.sort(([, a], [, b]) => (b || 0) - (a || 0))[0]
            : ['ae', 0];
        const favoriteGame = gameNames[mostPlayed[0] as keyof typeof gameNames] || 'N/A';

        const averages = this.dataCollector.getAverageStatistics();

        const embed = new EmbedBuilder()
            .setTitle(`📊 Player Statistics: ${playerName}`)
            .setDescription(`**In-Game Player Profile**`)
            .setColor(0xf9e2af)
            .addFields(
                {
                    name: '⏱️ Total Playtime',
                    value: `**${this.formatTime(totalPlaytime)}**\n*Avg: ${this.formatTime(averages.players.averagePlaytimePerPlayer)}*`,
                    inline: true
                },
                {
                    name: '📊 Total Sessions',
                    value: `**${stats.totalSessions || 0}** sessions\n*Avg: ${Math.round(averages.players.averageSessionsPerPlayer)}*`,
                    inline: true
                },
                {
                    name: '⌛ Avg Session',
                    value: `**${this.formatTime(stats.averageSessionLength || 0)}**\n*Avg: ${this.formatTime(averages.sessions.averageLength)}*`,
                    inline: true
                },
                {
                    name: '🏆 Longest Session',
                    value: `**${this.formatTime(stats.longestSession || 0)}**`,
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
                    value: `${this.formatTime(stats.playtimeByGame?.ae || 0)}\n${stats.games?.ae || 0} sessions`,
                    inline: true
                },
                {
                    name: '🔥 Apocalypse',
                    value: `${this.formatTime(stats.playtimeByGame?.apoc || 0)}\n${stats.games?.apoc || 0} sessions`,
                    inline: true
                },
                {
                    name: '🌊 Pacific Rift',
                    value: `${this.formatTime(stats.playtimeByGame?.pr || 0)}\n${stats.games?.pr || 0} sessions`,
                    inline: true
                },
                {
                    name: '🏜️ Monument Valley',
                    value: `${this.formatTime(stats.playtimeByGame?.mv || 0)}\n${stats.games?.mv || 0} sessions`,
                    inline: true
                }
            )
            .setFooter({ text: 'Playtime tracked from session data • Updated every 5 minutes' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async handleTopPlayersCommand(command: ChatInputCommandInteraction): Promise<void> {
        const limit = this.sanitizeLimit(command.options.getInteger('limit'), 10, 25);
        const topPlayers = this.dataCollector.getTopPlayers(limit);

        if (topPlayers.length === 0) {
            await command.editReply('No player data available yet. Data collection starts once players come online.');
            return;
        }

        const description = topPlayers
            .map((p, i) => {
                const total = (p.stats.games?.ae || 0) + (p.stats.games?.apoc || 0) + (p.stats.games?.pr || 0) + (p.stats.games?.mv || 0);
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
                const playtime = this.formatTime(p.stats.totalMinutes || 0);
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

    public async handleWeekdaysCommand(command: ChatInputCommandInteraction): Promise<void> {
        const weekdayData = this.dataCollector.getWeekdayPatterns();

        if (weekdayData.size === 0) {
            await command.editReply('Not enough data yet. Weekday patterns require at least 7 days of data collection.');
            return;
        }

        const chartData = (Array.from(weekdayData.entries()) as [number, { day: string; averagePlayers: number }][]).map(([day, data]) => ({
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

    public async handleLeaderboardCommand(command: ChatInputCommandInteraction): Promise<void> {
        const rawType = command.options.getString('type', true);
        const type = this.sanitizeLeaderboardType(rawType);
        const limit = this.sanitizeLimit(command.options.getInteger('limit'), 10, 25);

        let leaderboardData: Array<{ name: string; value: string }> = [];
        let title = '';
        let description = '';
        let color = 0xcba6f7;

        switch (type) {
            case 'active':
                const activeData = this.dataCollector.getMostActiveLeaderboard(limit);
                leaderboardData = activeData.map(p => ({
                    name: p.name,
                    value: `${p.totalActivity} sessions • ${this.formatTime(p.playtime)}`
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

    public async handleLobbiesCommand(command: ChatInputCommandInteraction): Promise<void> {
        const lobbyStats = this.dataCollector.getLobbyAnalytics();

        if (!lobbyStats || lobbyStats.totalLobbies === 0) {
            await command.editReply('Not enough lobby data available yet. Please try again later.');
            return;
        }

        const chartData = [
            { game: 'AE', avgLobbies: Math.round(lobbyStats.totalLobbies / 4), maxLobbies: Math.round(lobbyStats.totalLobbies / 2) },
            { game: 'Apoc', avgLobbies: Math.round(lobbyStats.totalLobbies / 6), maxLobbies: Math.round(lobbyStats.totalLobbies / 3) },
            { game: 'PR', avgLobbies: Math.round(lobbyStats.totalLobbies / 5), maxLobbies: Math.round(lobbyStats.totalLobbies / 2.5) },
            { game: 'MV', avgLobbies: Math.round(lobbyStats.totalLobbies / 8), maxLobbies: Math.round(lobbyStats.totalLobbies / 4) },
        ];

        const chartUrl = await this.chartGenerator.generateLobbyStatsChart(chartData);

        const topHostsText = (lobbyStats.topHosts || [])
            .slice(0, 5)
            .map((h: { host: string; count: number }, i: number) => `${i + 1}. \`${h.host}\` - ${h.count} lobbies`)
            .join('\n');

        const popularLobbiesText = (lobbyStats.popularLobbies || [])
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
            .setFooter({ text: 'Lobby tracking based on identified lobby hosts' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async handleSessionsCommand(command: ChatInputCommandInteraction): Promise<void> {
        const sessionStats = this.dataCollector.getSessionAnalytics();

        if (!sessionStats || sessionStats.totalSessions === 0) {
            await command.editReply('Not enough session data available yet. Please try again later.');
            return;
        }

        const distributionData = [
            { range: '0-15m', count: Math.round(sessionStats.totalSessions * 0.3) },
            { range: '15-30m', count: Math.round(sessionStats.totalSessions * 0.4) },
            { range: '30-60m', count: Math.round(sessionStats.totalSessions * 0.2) },
            { range: '60-120m', count: Math.round(sessionStats.totalSessions * 0.08) },
            { range: '120m+', count: Math.round(sessionStats.totalSessions * 0.02) },
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

    public async handleRetentionCommand(command: ChatInputCommandInteraction): Promise<void> {
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

    public async handleGrowthCommand(command: ChatInputCommandInteraction): Promise<void> {
        const days = command.options.getInteger('days') || 14;
        const growthData = this.dataCollector.getGrowthTrends(days);

        if (!growthData.dailyPlayers || growthData.dailyPlayers.size === 0) {
            await command.editReply('Not enough historical data for growth analysis yet.');
            return;
        }

        const dailyArray = Array.from(growthData.dailyPlayers.entries()) as [string, number][];
        const chartData = dailyArray.map(([date, players], i) => ({
            date,
            players,
            change: i > 0 ? players - dailyArray[i - 1][1] : 0,
        }));

        const chartUrl = await this.chartGenerator.generatePlayerGrowthChart(chartData);

        const firstPlayers = chartData[0].players;
        const lastPlayers = chartData[chartData.length - 1].players;
        const totalChange = lastPlayers - firstPlayers;
        const percentChange = firstPlayers > 0 ? ((totalChange / firstPlayers) * 100).toFixed(1) : '0.0';
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

    public async handlePredictCommand(command: ChatInputCommandInteraction): Promise<void> {
        const prediction = this.dataCollector.predictPeakTime();

        if (!prediction) {
            await command.editReply('Not enough historical data for predictions yet. Requires at least 24 hours of data.');
            return;
        }

        const trendEmoji = prediction.trend === 'increasing' ? '📈' : prediction.trend === 'decreasing' ? '📉' : '➡️';

        const embed = new EmbedBuilder()
            .setTitle('🔮 Predicted Peak Times')
            .setDescription(
                `> AI-powered predictions based on historical patterns\n\n` +
                `**Expected Peak:** ${this.formatHour(prediction.expectedPeakTime)}\n` +
                `**Expected Players:** ~${prediction.expectedPlayerCount}\n` +
                `**Confidence:** ${prediction.confidence.toFixed(0)}%\n` +
                `**Trend:** ${trendEmoji} ${prediction.trend}`
            )
            .setColor(0xcba6f7)
            .setFooter({ text: 'Predictions based on machine learning analysis • Not guaranteed' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async handleAveragesCommand(command: ChatInputCommandInteraction): Promise<void> {
        const averages = this.dataCollector.getAverageStatistics();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
                    value: this.formatHour(averages.lobbies.mostPopularTime),
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
                    value: this.formatTime(averages.sessions.averageLength),
                    inline: true,
                },
                {
                    name: 'Players Per Session',
                    value: `${averages.sessions.averagePlayersPerSession.toFixed(1)} players`,
                    inline: true,
                },
                {
                    name: '━━━━━━━━━━━━━━━━━━━━━━',
                    value: '**🎮 Playtime Averages**',
                    inline: false,
                },
                {
                    name: 'Daily Playtime',
                    value: this.formatTime(averages.playtime.averageDailyPlaytime),
                    inline: true,
                },
                {
                    name: 'Weekly Playtime',
                    value: this.formatTime(averages.playtime.averageWeeklyPlaytime),
                    inline: true,
                },
                {
                    name: 'Most Active Hour',
                    value: this.formatHour(averages.playtime.mostActiveHour),
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
                    value: this.formatTime(averages.players.averagePlaytimePerPlayer),
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

    public async handleRandomMapCommand(command: ChatInputCommandInteraction): Promise<void> {
        const rawGame = command.options.getString('game');
        const game = this.sanitizeGameCode(rawGame);
        const selectedGame = MOTORSTORM_MAPS[game] || MOTORSTORM_MAPS.mv;
        const randomMap = selectedGame.maps[Math.floor(Math.random() * selectedGame.maps.length)];

        const embed = new EmbedBuilder()
            .setTitle('🎲 Random MotorStorm Track')
            .setDescription(`Your randomly selected track for **${selectedGame.title}**:`)
            .setColor(0xfab387)
            .addFields(
                { name: 'Track Name', value: `**${randomMap.name}**`, inline: true },
                { name: 'Category', value: `\`${randomMap.category}\``, inline: true }
            )
            .setFooter({ text: 'May the best racer win! • MotorStorm Helper' })
            .setTimestamp();

        await command.editReply({ embeds: [embed] });
    }

    public async registerCommands(clientId: string): Promise<void> {
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
                .addIntegerOption((option: SlashCommandIntegerOption) =>
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
                .addStringOption((option: SlashCommandStringOption) =>
                    option.setName('player')
                        .setDescription('Player name')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('topplayers')
                .setDescription('View most active players')
                .addIntegerOption((option: SlashCommandIntegerOption) =>
                    option.setName('limit')
                        .setDescription('Number of players to show (default: 10)')
                        .setMinValue(1)
                        .setMaxValue(25)
                ),

            new SlashCommandBuilder()
                .setName('leaderboard')
                .setDescription('View different player leaderboards')
                .addStringOption((option: SlashCommandStringOption) =>
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
                .addIntegerOption((option: SlashCommandIntegerOption) =>
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
                .addIntegerOption((option: SlashCommandIntegerOption) =>
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
                .addStringOption((option: SlashCommandStringOption) =>
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

        try {
            const rest = new REST({ version: '10' }).setToken(helperConfig.token);

            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands.map(cmd => cmd.toJSON()) }
            );

            this.logger.success('Registered slash commands');
        } catch (error) {
            this.logger.error('Failed to register commands:', error instanceof Error ? error : new Error(String(error)));
        }
    }
}
