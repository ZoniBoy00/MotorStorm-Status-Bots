import {
  PlayerStatistics,
  ActivitySnapshot,
  LobbyAnalytics,
  SessionRecord,
  PlayerSessionStats,
  GameModeStats,
  SocialStats,
  RetentionMetrics,
  PredictiveData,
  AverageStatistics,
} from '../../types';
import { Logger } from '../../utils';
import { Database } from '../../utils/database';

export class DataCollector {
  private logger: Logger;
  private playerStats: Map<string, PlayerStatistics> = new Map();
  private snapshots: ActivitySnapshot[] = [];
  private maxSnapshots = 10000;

  private lobbyTracking: Map<string, LobbyAnalytics> = new Map();
  private sessionRecords: SessionRecord[] = [];
  private activeSessions: Map<string, { game: 'ae' | 'apoc' | 'pr' | 'mv'; start: number }> = new Map();
  private gameModeStats: Map<string, GameModeStats> = new Map();
  private socialConnections: Map<string, SocialStats> = new Map();

  constructor() {
    this.logger = new Logger('DataCollector');
  }

  public async init(): Promise<void> {
    try {
      await Database.init();
      await this.loadFromDatabase();
      this.logger.success('DataCollector initialized with MySQL');
    } catch (error) {
      this.logger.error('Failed to initialize DataCollector:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadFromDatabase(): Promise<void> {
    try {
      // Load Snapshots
      const snapshots: any[] = await Database.query(
        'SELECT * FROM snapshots ORDER BY timestamp DESC LIMIT ?',
        [this.maxSnapshots]
      );
      this.snapshots = snapshots.map(s => ({
        timestamp: Number(s.timestamp),
        ae: { players: JSON.parse(s.ae_players || '[]'), lobbies: s.ae_lobbies },
        apoc: { players: JSON.parse(s.apoc_players || '[]'), lobbies: s.apoc_lobbies },
        pr: { players: JSON.parse(s.pr_players || '[]'), lobbies: s.pr_lobbies },
        mv: { players: JSON.parse(s.mv_players || '[]'), lobbies: s.mv_lobbies },
        totalPlayers: s.total_players
      })).reverse();

      // Load Player Stats
      const playerStats: any[] = await Database.query('SELECT * FROM player_stats');
      for (const s of playerStats) {
        this.playerStats.set(s.player_name, {
          totalSessions: s.total_sessions,
          totalMinutes: s.total_minutes,
          lastSeen: Number(s.last_seen),
          firstSeen: Number(s.first_seen),
          games: { ae: s.ae_sessions, apoc: s.apoc_sessions, pr: s.pr_sessions, mv: s.mv_sessions },
          peakHours: JSON.parse(s.peak_hours || '{}'),
          peakDays: JSON.parse(s.peak_days || '{}'),
          lobbiesJoined: [],
          playtimeByGame: { ae: s.playtime_ae, apoc: s.playtime_apoc, pr: s.playtime_pr, mv: s.playtime_mv },
          averageSessionLength: s.average_session_length,
          longestSession: s.longest_session
        });
      }

      // Load Sessions
      const sessions: any[] = await Database.query('SELECT * FROM sessions ORDER BY session_start DESC LIMIT 10000');
      this.sessionRecords = sessions.map(s => ({
        playerName: s.player_name,
        game: s.game as any,
        sessionStart: Number(s.session_start),
        sessionEnd: Number(s.session_end),
        duration: s.duration
      })).reverse();

      // Load Lobby Analytics
      const lobbies: any[] = await Database.query('SELECT * FROM lobby_analytics');
      for (const l of lobbies) {
        this.lobbyTracking.set(l.lobby_key, {
          lobbyName: l.lobby_name,
          game: l.game as any,
          appearances: l.appearances,
          averageDuration: l.average_duration,
          averagePlayers: l.average_players,
          firstSeen: Number(l.first_seen),
          lastSeen: Number(l.last_seen),
        });
      }

      // Load Social Connections
      const social: any[] = await Database.query('SELECT * FROM social_connections');
      for (const s of social) {
        let stats = this.socialConnections.get(s.player_name);
        if (!stats) {
          stats = { coPlayers: new Map(), lobbiesCreated: 0, lobbiesJoined: 0, mostFrequentPartner: '' };
          this.socialConnections.set(s.player_name, stats);
        }
        stats.coPlayers.set(s.co_player_name, s.count);
      }

      // Load Game Modes
      const modes: any[] = await Database.query('SELECT * FROM game_modes');
      for (const m of modes) {
        this.gameModeStats.set(m.mode, {
          mode: m.mode,
          count: m.count,
          popularTracks: new Map(Object.entries(JSON.parse(m.popular_tracks || '{}'))),
          averageLaps: m.average_laps,
          direction: { forward: m.direction_forward, reverse: m.direction_reverse }
        });
      }

      this.logger.info(`Loaded historical data from MySQL: ${this.snapshots.length} snapshots, ${this.playerStats.size} players, ${this.sessionRecords.length} sessions`);
    } catch (error) {
      this.logger.error('Failed to load data from MySQL:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public async recordSnapshot(
    aeData: { players: string[]; lobbies: number; lobbyList?: any[] },
    apocData: { players: string[]; lobbies: number; lobbyList?: any[] },
    prData: { players: string[]; lobbies: number; lobbyList?: any[] },
    mvData: { players: string[]; lobbies: number; lobbyList?: any[] }
  ): Promise<void> {
    const timestamp = Date.now();
    const uniquePlayers = new Set([
      ...aeData.players,
      ...apocData.players,
      ...prData.players,
      ...mvData.players,
    ]);

    const snapshot: ActivitySnapshot = {
      timestamp,
      ae: { players: aeData.players, lobbies: aeData.lobbies },
      apoc: { players: apocData.players, lobbies: apocData.lobbies },
      pr: { players: prData.players, lobbies: prData.lobbies },
      mv: { players: mvData.players, lobbies: mvData.lobbies },
      totalPlayers: uniquePlayers.size,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Write Snapshot to DB
    Database.query(
      'INSERT INTO snapshots (timestamp, ae_players, ae_lobbies, apoc_players, apoc_lobbies, pr_players, pr_lobbies, mv_players, mv_lobbies, total_players) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        snapshot.timestamp,
        JSON.stringify(snapshot.ae.players),
        snapshot.ae.lobbies,
        JSON.stringify(snapshot.apoc.players),
        snapshot.apoc.lobbies,
        JSON.stringify(snapshot.pr.players),
        snapshot.pr.lobbies,
        JSON.stringify(snapshot.mv.players),
        snapshot.mv.lobbies,
        snapshot.totalPlayers
      ]
    ).catch(err => this.logger.error(`Failed to save snapshot: ${err.message}`));

    // Update Player Registry
    for (const player of uniquePlayers) {
      const games = [];
      if (aeData.players.includes(player)) games.push('ae');
      if (apocData.players.includes(player)) games.push('apoc');
      if (prData.players.includes(player)) games.push('pr');
      if (mvData.players.includes(player)) games.push('mv');

      Database.query(
        'INSERT INTO player_registry (player_name, first_seen, last_seen, games_played) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_seen = ?, games_played = ?',
        [player, timestamp, timestamp, JSON.stringify(games), timestamp, JSON.stringify(games)]
      ).catch(() => { });
    }

    await this.trackPlayerSessions(snapshot);
    this.trackLobbies(aeData, 'ae');
    this.trackLobbies(apocData, 'apoc');
    this.trackLobbies(prData, 'pr');
    this.trackLobbies(mvData, 'mv');
    this.trackSocialConnections(snapshot);

    await this.recordPlayerActivity('ae', aeData.players);
    await this.recordPlayerActivity('apoc', apocData.players);
    await this.recordPlayerActivity('pr', prData.players);
    await this.recordPlayerActivity('mv', mvData.players);

    await this.syncToDatabase();
  }

  private trackLobbies(
    data: { players: string[]; lobbies: number; lobbyList?: any[] },
    game: 'ae' | 'apoc' | 'pr' | 'mv'
  ): void {
    if (!data.lobbyList || data.lobbyList.length === 0) return;

    const now = Date.now();
    for (const lobby of data.lobbyList) {
      if (!lobby.is_active) continue;

      const lobbyName = lobby.name || 'Unnamed Lobby';
      const key = `${game}:${lobbyName}`;

      let analytics = this.lobbyTracking.get(key);
      if (!analytics) {
        analytics = {
          lobbyName,
          appearances: 0,
          averageDuration: 0,
          averagePlayers: 0,
          firstSeen: now,
          lastSeen: now,
          game,
        };
        this.lobbyTracking.set(key, analytics);
      }

      analytics.appearances++;
      const durationMinutes = Math.floor((now - analytics.lastSeen) / 60000);
      if (durationMinutes > 0 && durationMinutes < 60) {
        analytics.averageDuration =
          ((analytics.averageDuration * (analytics.appearances - 1)) + durationMinutes) /
          analytics.appearances;
      }

      analytics.lastSeen = now;
      analytics.averagePlayers =
        ((analytics.averagePlayers * (analytics.appearances - 1)) + (lobby.player_count || 0)) /
        analytics.appearances;

      if (lobby.config) {
        const { gameMode, track, direction } = lobby.config;
        if (gameMode) {
          let modeStats = this.gameModeStats.get(gameMode);
          if (!modeStats) {
            modeStats = { mode: gameMode, count: 0, popularTracks: new Map(), averageLaps: 0, direction: { forward: 0, reverse: 0 } };
            this.gameModeStats.set(gameMode, modeStats);
          }
          modeStats.count++;
          if (track) {
            modeStats.popularTracks.set(track, (modeStats.popularTracks.get(track) || 0) + 1);
            Database.query('INSERT INTO track_popularity (track_name, count, game) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE count = count + 1', [track, game]).catch(() => { });
          }
          if (direction) {
            if (direction.toLowerCase().includes('reverse')) modeStats.direction.reverse++;
            else modeStats.direction.forward++;
          }

          Database.query(
            'INSERT INTO game_modes (mode, count, popular_tracks, average_laps, direction_forward, direction_reverse) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = ?, popular_tracks = ?, average_laps = ?, direction_forward = ?, direction_reverse = ?',
            [gameMode, modeStats.count, JSON.stringify(Object.fromEntries(modeStats.popularTracks)), 0, modeStats.direction.forward, modeStats.direction.reverse, modeStats.count, JSON.stringify(Object.fromEntries(modeStats.popularTracks)), 0, modeStats.direction.forward, modeStats.direction.reverse]
          ).catch(() => { });
        }
      }
    }
  }

  private async syncToDatabase(): Promise<void> {
    try {
      for (const [key, l] of this.lobbyTracking.entries()) {
        await Database.query(
          'INSERT INTO lobby_analytics (lobby_key, lobby_name, game, appearances, average_duration, average_players, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE appearances = ?, average_duration = ?, average_players = ?, last_seen = ?',
          [key, l.lobbyName, l.game, l.appearances, l.averageDuration, l.averagePlayers, l.firstSeen || Date.now(), l.lastSeen, l.appearances, l.averageDuration, l.averagePlayers, l.lastSeen]
        );
      }
    } catch (error) {
      this.logger.error('Failed to sync to MySQL:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async trackPlayerSessions(snapshot: ActivitySnapshot): Promise<void> {
    const now = Date.now();
    const currentPlayers = new Set([...snapshot.ae.players, ...snapshot.apoc.players, ...snapshot.pr.players, ...snapshot.mv.players]);

    for (const player of currentPlayers) {
      if (!this.activeSessions.has(player)) {
        const game = snapshot.ae.players.includes(player) ? 'ae' : snapshot.apoc.players.includes(player) ? 'apoc' : snapshot.pr.players.includes(player) ? 'pr' : 'mv';
        this.activeSessions.set(player, { game, start: now });
      }
    }

    for (const [player, session] of Array.from(this.activeSessions.entries())) {
      if (!currentPlayers.has(player)) {
        const duration = Math.floor((now - session.start) / 60000);
        if (duration >= 1) {
          const sessionRecord: SessionRecord = { playerName: player, game: session.game, sessionStart: session.start, sessionEnd: now, duration };
          this.sessionRecords.push(sessionRecord);
          Database.query('INSERT INTO sessions (player_name, game, session_start, session_end, duration) VALUES (?, ?, ?, ?, ?)', [sessionRecord.playerName, sessionRecord.game, sessionRecord.sessionStart, sessionRecord.sessionEnd, sessionRecord.duration]).catch(() => { });

          let stats = this.playerStats.get(player);
          if (!stats) { stats = this.createEmptyStats(now); this.playerStats.set(player, stats); }
          stats.totalMinutes += duration; stats.playtimeByGame[session.game] += duration; stats.totalSessions++;
          stats.averageSessionLength = stats.totalMinutes / stats.totalSessions;
          if (duration > stats.longestSession) stats.longestSession = duration;
          await this.updatePlayerStatsInDB(player, stats);
        }
        this.activeSessions.delete(player);
      }
    }
  }

  private createEmptyStats(now: number): PlayerStatistics {
    return { totalSessions: 0, totalMinutes: 0, lastSeen: now, firstSeen: now, games: { ae: 0, apoc: 0, pr: 0, mv: 0 }, peakHours: {}, peakDays: {}, lobbiesJoined: [], playtimeByGame: { ae: 0, apoc: 0, pr: 0, mv: 0 }, averageSessionLength: 0, longestSession: 0 };
  }

  private async updatePlayerStatsInDB(name: string, s: PlayerStatistics): Promise<void> {
    await Database.query(
      'INSERT INTO player_stats (player_name, total_sessions, total_minutes, last_seen, first_seen, ae_sessions, apoc_sessions, pr_sessions, mv_sessions, peak_hours, peak_days, playtime_ae, playtime_apoc, playtime_pr, playtime_mv, average_session_length, longest_session) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE total_sessions = ?, total_minutes = ?, last_seen = ?, ae_sessions = ?, apoc_sessions = ?, pr_sessions = ?, mv_sessions = ?, peak_hours = ?, peak_days = ?, playtime_ae = ?, playtime_apoc = ?, playtime_pr = ?, playtime_mv = ?, average_session_length = ?, longest_session = ?',
      [name, s.totalSessions, s.totalMinutes, s.lastSeen, s.firstSeen, s.games.ae, s.games.apoc, s.games.pr, s.games.mv, JSON.stringify(s.peakHours), JSON.stringify(s.peakDays), s.playtimeByGame.ae, s.playtimeByGame.apoc, s.playtimeByGame.pr, s.playtimeByGame.mv, s.averageSessionLength, s.longestSession, s.totalSessions, s.totalMinutes, s.lastSeen, s.games.ae, s.games.apoc, s.games.pr, s.games.mv, JSON.stringify(s.peakHours), JSON.stringify(s.peakDays), s.playtimeByGame.ae, s.playtimeByGame.apoc, s.playtimeByGame.pr, s.playtimeByGame.mv, s.averageSessionLength, s.longestSession]
    ).catch(() => { });
  }

  private async trackSocialConnections(snapshot: ActivitySnapshot): Promise<void> {
    const games = [{ game: 'ae', players: snapshot.ae.players }, { game: 'apoc', players: snapshot.apoc.players }, { game: 'pr', players: snapshot.pr.players }, { game: 'mv', players: snapshot.mv.players }];
    for (const { players } of games) {
      if (players.length < 2) continue;
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        let social = this.socialConnections.get(player);
        if (!social) { social = { coPlayers: new Map(), lobbiesCreated: 0, lobbiesJoined: 0, mostFrequentPartner: '' }; this.socialConnections.set(player, social); }
        for (let j = 0; j < players.length; j++) {
          if (i !== j) {
            const coPlayer = players[j];
            const newCount = (social.coPlayers.get(coPlayer) || 0) + 1;
            social.coPlayers.set(coPlayer, newCount);
            Database.query('INSERT INTO social_connections (player_name, co_player_name, count) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE count = count + 1', [player, coPlayer]).catch(() => { });
          }
        }
      }
    }
  }

  private async recordPlayerActivity(game: 'ae' | 'apoc' | 'pr' | 'mv', players: string[]): Promise<void> {
    const now = Date.now();
    const hour = new Date(now).getHours();
    const day = new Date(now).getDay();
    for (const player of players) {
      let stats = this.playerStats.get(player);
      if (!stats) { stats = this.createEmptyStats(now); this.playerStats.set(player, stats); }
      stats.lastSeen = now; stats.games[game]++; stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1; stats.peakDays[day] = (stats.peakDays[day] || 0) + 1;
      await this.updatePlayerStatsInDB(player, stats);
    }
  }

  public getPlayerStats(playerName: string): PlayerStatistics | null { return this.playerStats.get(playerName) || null; }
  public getTopPlayers(limit: number = 10): Array<{ name: string; stats: PlayerStatistics }> { return Array.from(this.playerStats.entries()).map(([name, stats]) => ({ name, stats })).sort((a, b) => b.stats.totalMinutes - a.stats.totalMinutes).slice(0, limit); }
  public getSnapshots(hours: number = 24): ActivitySnapshot[] { const cutoff = Date.now() - (hours * 60 * 60 * 1000); return this.snapshots.filter(s => s.timestamp >= cutoff); }
  public getPeakTimes(): { hour: number; count: number }[] {
    const hourlyUniquePlayers = new Map<number, Set<string>>();
    for (const snapshot of this.snapshots) {
      const hour = new Date(snapshot.timestamp).getHours();
      if (!hourlyUniquePlayers.has(hour)) hourlyUniquePlayers.set(hour, new Set());
      const playerSet = hourlyUniquePlayers.get(hour)!;
      [...snapshot.ae.players, ...snapshot.apoc.players, ...snapshot.pr.players, ...snapshot.mv.players].forEach(p => playerSet.add(p));
    }
    return Array.from(hourlyUniquePlayers.entries()).map(([hour, players]) => ({ hour, count: players.size })).sort((a, b) => a.hour - b.hour);
  }
  public getDailyActivity(days: number = 7): Map<string, number> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const dailyActivity = new Map<string, number>();
    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp < cutoff) continue;
      const date = new Date(snapshot.timestamp).toISOString().split('T')[0];
      dailyActivity.set(date, Math.max(dailyActivity.get(date) || 0, snapshot.totalPlayers));
    }
    return dailyActivity;
  }
  public getPopularLobbies(limit: number = 10): LobbyAnalytics[] { return Array.from(this.lobbyTracking.values()).sort((a, b) => b.appearances - a.appearances).slice(0, limit); }
  public getLobbyDurationStats(): { averageDuration: number; longestActive: LobbyAnalytics | null } {
    const lobbies = Array.from(this.lobbyTracking.values());
    if (lobbies.length === 0) return { averageDuration: 0, longestActive: null };
    const avgDuration = lobbies.reduce((sum, l) => sum + l.averageDuration, 0) / lobbies.length;
    const longest = lobbies.sort((a, b) => b.averageDuration - a.averageDuration)[0];
    return { averageDuration: avgDuration, longestActive: longest };
  }
  public getPlayerSessionStats(playerName: string): PlayerSessionStats | null {
    const sessions = this.sessionRecords.filter(s => s.playerName === playerName);
    if (sessions.length === 0) return null;
    const durations = sessions.map(s => s.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const sortedSessions = sessions.sort((a, b) => a.sessionStart - b.sessionStart);
    let currentStreak = 1;
    for (let i = 1; i < sortedSessions.length; i++) {
      const dayDiff = Math.floor((sortedSessions[i].sessionStart - sortedSessions[i - 1].sessionStart) / (24 * 60 * 60 * 1000));
      if (dayDiff <= 1) currentStreak++;
      else currentStreak = 1;
    }
    return { totalSessions: sessions.length, averageSessionLength: totalDuration / sessions.length, longestSession: Math.max(...durations), shortestSession: Math.min(...durations), streakDays: currentStreak, lastSessionDate: sessions[sessions.length - 1].sessionEnd };
  }
  public getRetentionMetrics(days: number = 7): RetentionMetrics {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentSessions = this.sessionRecords.filter(s => s.sessionStart >= cutoff);
    const newPlayers = new Set<string>();
    const returningPlayers = new Set<string>();
    for (const session of recentSessions) {
      const allSessions = this.sessionRecords.filter(s => s.playerName === session.playerName);
      if (allSessions[0].sessionStart >= cutoff) newPlayers.add(session.playerName);
      else returningPlayers.add(session.playerName);
    }
    const totalPlayers = newPlayers.size + returningPlayers.size;
    const retentionRate = totalPlayers > 0 ? (returningPlayers.size / totalPlayers) * 100 : 0;
    return { newPlayers: newPlayers.size, returningPlayers: returningPlayers.size, retentionRate, churnRate: 100 - retentionRate };
  }
  public predictPeakTime(): PredictiveData | null {
    if (this.snapshots.length < 24) return null;
    const hourTotals = Array(24).fill(0); const hourCounts = Array(24).fill(0);
    for (const snapshot of this.snapshots) { const hour = new Date(snapshot.timestamp).getHours(); hourTotals[hour] += snapshot.totalPlayers; hourCounts[hour]++; }
    const avgs = hourTotals.map((t, i) => hourCounts[i] > 0 ? t / hourCounts[i] : 0);
    const maxAvg = Math.max(...avgs); const peakHour = avgs.indexOf(maxAvg);
    return { expectedPeakTime: peakHour, expectedPlayerCount: Math.round(maxAvg), confidence: 85, trend: 'stable' };
  }
  public getSocialStats(playerName: string): SocialStats | null { return this.socialConnections.get(playerName) || null; }
  public getMostSocialPlayers(limit: number = 10): Array<{ name: string; uniqueCoPlayers: number }> { return Array.from(this.socialConnections.entries()).map(([name, stats]) => ({ name, uniqueCoPlayers: stats.coPlayers.size })).sort((a, b) => b.uniqueCoPlayers - a.uniqueCoPlayers).slice(0, limit); }
  public getWeekOverWeekGrowth(): { growth: number; percentChange: number } {
    const now = Date.now(); const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000); const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
    const thisWeek = this.snapshots.filter(s => s.timestamp >= oneWeekAgo); const lastWeek = this.snapshots.filter(s => s.timestamp >= twoWeeksAgo && s.timestamp < oneWeekAgo);
    const thisWeekTotal = thisWeek.reduce((sum, s) => sum + s.totalPlayers, 0); const lastWeekTotal = lastWeek.reduce((sum, s) => sum + s.totalPlayers, 0);
    const growth = thisWeekTotal - lastWeekTotal; const percentChange = lastWeekTotal > 0 ? (growth / lastWeekTotal) * 100 : 0;
    return { growth, percentChange };
  }
  public getAverageStatistics(): AverageStatistics {
    const lobbies = Array.from(this.lobbyTracking.values());
    const allPlayers = Array.from(this.playerStats.values());
    const avgLobbySize = lobbies.length > 0 ? lobbies.reduce((sum, l) => sum + l.averagePlayers, 0) / lobbies.length : 0;
    const avgLobbyDuration = lobbies.length > 0 ? lobbies.reduce((sum, l) => sum + l.averageDuration, 0) / lobbies.length : 0;
    const hourCounts = new Map<number, number>(); const dayCounts = new Map<number, number>();
    for (const snapshot of this.snapshots) { const hour = new Date(snapshot.timestamp).getHours(); const day = new Date(snapshot.timestamp).getDay(); hourCounts.set(hour, (hourCounts.get(hour) || 0) + snapshot.totalPlayers); dayCounts.set(day, (dayCounts.get(day) || 0) + snapshot.totalPlayers); }
    const mostPopularHour = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    const mostPopularDay = Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    const avgSessionLength = this.sessionRecords.length > 0 ? this.sessionRecords.reduce((sum, s) => sum + s.duration, 0) / this.sessionRecords.length : 0;
    const avgSessionsPerPlayer = allPlayers.length > 0 ? allPlayers.reduce((sum, p) => sum + p.totalSessions, 0) / allPlayers.length : 0;
    const totalPlaytime = allPlayers.reduce((sum, p) => sum + p.totalMinutes, 0);
    const totalGames = allPlayers.reduce((sum, p) => sum + p.games.ae + p.games.apoc + p.games.pr + p.games.mv, 0);
    const avgPlaytimePerPlayer = allPlayers.length > 0 ? totalPlaytime / allPlayers.length : 0;
    const avgGamesPerPlayer = allPlayers.length > 0 ? totalGames / allPlayers.length : 0;
    return {
      lobbies: { averageSize: avgLobbySize, averageDuration: avgLobbyDuration, mostPopularTime: mostPopularHour, mostPopularDay: mostPopularDay },
      sessions: { averageLength: avgSessionLength, averagePlayersPerSession: avgLobbySize, averageSessionsPerPlayer: avgSessionsPerPlayer },
      playtime: { averageDailyPlaytime: totalPlaytime / 30, averageWeeklyPlaytime: (totalPlaytime / 30) * 7, mostActiveHour: mostPopularHour, mostActiveDay: mostPopularDay },
      players: { averageSessionsPerPlayer: avgSessionsPerPlayer, averagePlaytimePerPlayer: avgPlaytimePerPlayer, averageGamesPerPlayer: avgGamesPerPlayer }
    };
  }
  public getWeekdayPatterns(): Map<number, { day: string; averagePlayers: number }> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayUniquePlayers = new Map<number, Set<string>>(); const dayCounts = new Map<number, number>();
    for (const snapshot of this.snapshots) {
      const day = new Date(snapshot.timestamp).getDay(); if (!dayUniquePlayers.has(day)) dayUniquePlayers.set(day, new Set());
      const playerSet = dayUniquePlayers.get(day)!;[...snapshot.ae.players, ...snapshot.apoc.players, ...snapshot.pr.players, ...snapshot.mv.players].forEach(p => playerSet.add(p));
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }
    const result = new Map<number, { day: string; averagePlayers: number }>();
    for (let i = 0; i < 7; i++) { const uniquePlayers = dayUniquePlayers.get(i)?.size || 0; const count = dayCounts.get(i) || 0; result.set(i, { day: dayNames[i], averagePlayers: count > 0 ? uniquePlayers / count : 0 }); }
    return result;
  }
  public getMostActiveLeaderboard(limit: number = 10): Array<{ name: string; totalActivity: number; playtime: number }> { return Array.from(this.playerStats.entries()).map(([name, stats]) => ({ name, totalActivity: stats.games.ae + stats.games.apoc + stats.games.pr + stats.games.mv, playtime: stats.totalMinutes })).sort((a, b) => b.totalActivity - a.totalActivity).slice(0, limit); }
  public getLongestStreakLeaderboard(limit: number = 10): Array<{ name: string; streakDays: number }> {
    const streaks: Array<{ name: string; streakDays: number }> = [];
    for (const [player, _] of this.playerStats.entries()) {
      const sessions = this.sessionRecords.filter(s => s.playerName === player).sort((a, b) => a.sessionStart - b.sessionStart);
      if (sessions.length === 0) continue;
      let currentStreak = 1; let maxStreak = 1;
      for (let i = 1; i < sessions.length; i++) {
        const dayDiff = Math.floor((sessions[i].sessionStart - sessions[i - 1].sessionStart) / (24 * 60 * 60 * 1000));
        if (dayDiff <= 1) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); } else { currentStreak = 1; }
      }
      streaks.push({ name: player, streakDays: maxStreak });
    }
    return streaks.sort((a, b) => b.streakDays - a.streakDays).slice(0, limit);
  }
  public getMostDiverseLeaderboard(limit: number = 10): Array<{ name: string; gamesPlayed: number }> { return Array.from(this.playerStats.entries()).map(([name, stats]) => ({ name, gamesPlayed: Object.values(stats.games).filter(count => count > 0).length })).sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, limit); }
  public getMostSocialLeaderboard(limit: number = 10): Array<{ name: string; uniquePartners: number }> { return Array.from(this.socialConnections.entries()).map(([name, stats]) => ({ name, uniquePartners: stats.coPlayers.size })).sort((a, b) => b.uniquePartners - a.uniquePartners).slice(0, limit); }
  public getLobbyAnalytics(): any {
    const lobbies = Array.from(this.lobbyTracking.values()); const hostCounts = new Map<string, number>(); const lobbyCounts = new Map<string, number>();
    for (const lobby of lobbies) { lobbyCounts.set(lobby.lobbyName, lobby.appearances); const hostMatch = lobby.lobbyName.match(/^([^']+)'s/); if (hostMatch) { const host = hostMatch[1]; hostCounts.set(host, (hostCounts.get(host) || 0) + 1); } }
    return { totalLobbies: lobbies.length, averageDuration: lobbies.length > 0 ? lobbies.reduce((sum, l) => sum + l.averageDuration, 0) / lobbies.length : 0, topHosts: Array.from(hostCounts.entries()).map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count).slice(0, 5), popularLobbies: Array.from(lobbyCounts.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5) };
  }
  public getSessionAnalytics(): any {
    if (this.sessionRecords.length === 0) return { totalSessions: 0, averageLength: 0, longestSession: null };
    const totalLength = this.sessionRecords.reduce((sum, s) => sum + s.duration, 0); const longest = this.sessionRecords.reduce((max, s) => s.duration > max.duration ? s : max);
    return { totalSessions: this.sessionRecords.length, averageLength: totalLength / this.sessionRecords.length, longestSession: { player: longest.playerName, duration: longest.duration } };
  }
  public getGrowthTrends(days: number = 30): any {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000); const dailyPlayers = new Map<string, Set<string>>();
    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp < cutoff) continue; const date = new Date(snapshot.timestamp).toISOString().split('T')[0];
      if (!dailyPlayers.has(date)) dailyPlayers.set(date, new Set()); const daySet = dailyPlayers.get(date)!;[...snapshot.ae.players, ...snapshot.apoc.players, ...snapshot.pr.players, ...snapshot.mv.players].forEach(p => daySet.add(p));
    }
    const dailyCount = new Map<string, number>(); for (const [date, players] of dailyPlayers.entries()) dailyCount.set(date, players.size);
    const { percentChange } = this.getWeekOverWeekGrowth();
    return { dailyPlayers: dailyCount, weekOverWeekGrowth: percentChange, trend: percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable' };
  }
  public saveData(): void { }
}
