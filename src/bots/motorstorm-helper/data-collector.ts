import * as fs from 'fs';
import * as path from 'path';
import {
  PlayerActivityRecord,
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

export class DataCollector {
  private logger: Logger;
  private dataPath: string;
  private activityLog: PlayerActivityRecord[] = [];
  private playerStats: Map<string, PlayerStatistics> = new Map();
  private snapshots: ActivitySnapshot[] = [];
  private maxSnapshots = 10000; // Keep last ~34 days of 5-min intervals

  private lobbyTracking: Map<string, LobbyAnalytics> = new Map();
  private sessionRecords: SessionRecord[] = [];
  private activeSessions: Map<string, { game: 'ae' | 'apoc' | 'pr' | 'mv'; start: number }> = new Map();
  private gameModeStats: Map<string, GameModeStats> = new Map();
  private socialConnections: Map<string, SocialStats> = new Map();

  constructor() {
    this.logger = new Logger('DataCollector');
    
    // Use /tmp for Pterodactyl environments
    const baseDir = process.env.PTERODACTYL_CONTAINER === 'true' 
      ? '/tmp/motorstorm-data'
      : path.join(process.cwd(), 'data');
    
    this.dataPath = baseDir;
    this.ensureDataDirectory();
    this.loadData();
    
    this.logger.info(`Data directory: ${this.dataPath}`);
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      this.logger.info(`Created data directory at ${this.dataPath}`);
    }
  }

  private loadData(): void {
    try {
      // Load activity log
      const activityPath = path.join(this.dataPath, 'activity.json');
      if (fs.existsSync(activityPath)) {
        const data = fs.readFileSync(activityPath, 'utf-8');
        this.activityLog = JSON.parse(data);
        this.logger.success(`Loaded ${this.activityLog.length} activity records`);
      }

      // Load player stats
      const statsPath = path.join(this.dataPath, 'player-stats.json');
      if (fs.existsSync(statsPath)) {
        const data = fs.readFileSync(statsPath, 'utf-8');
        const statsObj = JSON.parse(data);
        this.playerStats = new Map(Object.entries(statsObj));
        this.logger.success(`Loaded stats for ${this.playerStats.size} players`);
      }

      // Load snapshots
      const snapshotsPath = path.join(this.dataPath, 'snapshots.json');
      if (fs.existsSync(snapshotsPath)) {
        const data = fs.readFileSync(snapshotsPath, 'utf-8');
        this.snapshots = JSON.parse(data);
        this.logger.success(`Loaded ${this.snapshots.length} snapshots`);
      }

      const lobbyPath = path.join(this.dataPath, 'lobby-analytics.json');
      if (fs.existsSync(lobbyPath)) {
        const data = fs.readFileSync(lobbyPath, 'utf-8');
        const lobbyObj = JSON.parse(data);
        this.lobbyTracking = new Map(Object.entries(lobbyObj));
        this.logger.success(`Loaded analytics for ${this.lobbyTracking.size} lobbies`);
      }

      const sessionsPath = path.join(this.dataPath, 'sessions.json');
      if (fs.existsSync(sessionsPath)) {
        const data = fs.readFileSync(sessionsPath, 'utf-8');
        this.sessionRecords = JSON.parse(data);
        this.logger.success(`Loaded ${this.sessionRecords.length} session records`);
      }

      const gameModePath = path.join(this.dataPath, 'game-modes.json');
      if (fs.existsSync(gameModePath)) {
        const data = fs.readFileSync(gameModePath, 'utf-8');
        const modeObj = JSON.parse(data);
        this.gameModeStats = new Map(Object.entries(modeObj).map(([k, v]: [string, any]) => [
          k,
          { ...v, popularTracks: new Map(Object.entries(v.popularTracks || {})) }
        ]));
        this.logger.success(`Loaded ${this.gameModeStats.size} game mode stats`);
      }

      const socialPath = path.join(this.dataPath, 'social.json');
      if (fs.existsSync(socialPath)) {
        const data = fs.readFileSync(socialPath, 'utf-8');
        const socialObj = JSON.parse(data);
        this.socialConnections = new Map(Object.entries(socialObj).map(([k, v]: [string, any]) => [
          k,
          { ...v, coPlayers: new Map(Object.entries(v.coPlayers || {})) }
        ]));
        this.logger.success(`Loaded social stats for ${this.socialConnections.size} players`);
      }
    } catch (error) {
      this.logger.error('Failed to load data:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public saveData(): void {
    try {
      // Save activity log
      const activityPath = path.join(this.dataPath, 'activity.json');
      fs.writeFileSync(
        activityPath,
        JSON.stringify(this.activityLog, null, 2)
      );

      // Save player stats
      const statsObj = Object.fromEntries(this.playerStats);
      fs.writeFileSync(
        path.join(this.dataPath, 'player-stats.json'),
        JSON.stringify(statsObj, null, 2)
      );

      // Save snapshots
      const snapshotsPath = path.join(this.dataPath, 'snapshots.json');
      fs.writeFileSync(
        snapshotsPath,
        JSON.stringify(this.snapshots, null, 2)
      );

      const lobbyObj = Object.fromEntries(this.lobbyTracking);
      fs.writeFileSync(
        path.join(this.dataPath, 'lobby-analytics.json'),
        JSON.stringify(lobbyObj, null, 2)
      );

      fs.writeFileSync(
        path.join(this.dataPath, 'sessions.json'),
        JSON.stringify(this.sessionRecords, null, 2)
      );

      const modeObj = Object.fromEntries(
        Array.from(this.gameModeStats.entries()).map(([k, v]) => [
          k,
          { ...v, popularTracks: Object.fromEntries(v.popularTracks) }
        ])
      );
      fs.writeFileSync(
        path.join(this.dataPath, 'game-modes.json'),
        JSON.stringify(modeObj, null, 2)
      );

      const socialObj = Object.fromEntries(
        Array.from(this.socialConnections.entries()).map(([k, v]) => [
          k,
          { ...v, coPlayers: Object.fromEntries(v.coPlayers) }
        ])
      );
      fs.writeFileSync(
        path.join(this.dataPath, 'social.json'),
        JSON.stringify(socialObj, null, 2)
      );

      this.logger.success(`Data saved: ${this.snapshots.length} snapshots, ${this.playerStats.size} players, ${this.lobbyTracking.size} lobbies tracked`);
    } catch (error) {
      this.logger.error('Failed to save data:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public recordSnapshot(
    aeData: { players: string[]; lobbies: number; lobbyList?: any[] },
    apocData: { players: string[]; lobbies: number; lobbyList?: any[] },
    prData: { players: string[]; lobbies: number; lobbyList?: any[] },
    mvData: { players: string[]; lobbies: number; lobbyList?: any[] }
  ): void {
    const uniquePlayers = new Set([
      ...aeData.players,
      ...apocData.players,
      ...prData.players,
      ...mvData.players,
    ]);

    const snapshot: ActivitySnapshot = {
      timestamp: Date.now(),
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

    this.logger.info(`Recorded snapshot: ${snapshot.totalPlayers} unique players (AE: ${aeData.players.length}, Apoc: ${apocData.players.length}, PR: ${prData.players.length}, MV: ${mvData.players.length})`);

    this.trackPlayerSessions(snapshot);
    
    this.trackLobbies(aeData, 'ae');
    this.trackLobbies(apocData, 'apoc');
    this.trackLobbies(prData, 'pr');
    this.trackLobbies(mvData, 'mv');
    
    this.trackSocialConnections(snapshot);

    this.recordPlayerActivity('ae', aeData.players);
    this.recordPlayerActivity('apoc', apocData.players);
    this.recordPlayerActivity('pr', prData.players);
    this.recordPlayerActivity('mv', mvData.players);

    this.saveData();
  }

  private trackPlayerSessions(snapshot: ActivitySnapshot): void {
    const now = Date.now();
    const currentPlayers = new Set([
      ...snapshot.ae.players,
      ...snapshot.apoc.players,
      ...snapshot.pr.players,
      ...snapshot.mv.players,
    ]);

    for (const player of currentPlayers) {
      if (!this.activeSessions.has(player)) {
        const game = snapshot.ae.players.includes(player) ? 'ae' :
                    snapshot.apoc.players.includes(player) ? 'apoc' :
                    snapshot.pr.players.includes(player) ? 'pr' : 'mv';
        this.activeSessions.set(player, { game, start: now });
        this.logger.info(`[Session Start] ${player} started playing ${game.toUpperCase()}`);
      }
    }

    for (const [player, session] of Array.from(this.activeSessions.entries())) {
      if (!currentPlayers.has(player)) {
        const duration = Math.floor((now - session.start) / 60000); // minutes
        
        // Only record sessions longer than 1 minute to avoid false positives
        if (duration >= 1) {
          // Record the session
          this.sessionRecords.push({
            playerName: player,
            game: session.game,
            sessionStart: session.start,
            sessionEnd: now,
            duration,
          });

          // Update player statistics
          let stats = this.playerStats.get(player);
          if (!stats) {
            stats = {
              totalSessions: 0,
              totalMinutes: 0,
              lastSeen: now,
              firstSeen: now,
              games: { ae: 0, apoc: 0, pr: 0, mv: 0 },
              peakHours: {},
              peakDays: {},
              lobbiesJoined: [],
              playtimeByGame: { ae: 0, apoc: 0, pr: 0, mv: 0 },
              averageSessionLength: 0,
              longestSession: 0,
            };
            this.playerStats.set(player, stats);
          }

          if (!stats.playtimeByGame) {
            stats.playtimeByGame = { ae: 0, apoc: 0, pr: 0, mv: 0 };
          }

          // Update playtime statistics
          stats.totalMinutes += duration;
          stats.playtimeByGame[session.game] += duration;
          stats.totalSessions++;

          // Update average session length
          stats.averageSessionLength = stats.totalMinutes / stats.totalSessions;

          // Update longest session
          if (duration > stats.longestSession) {
            stats.longestSession = duration;
          }

          this.logger.info(`[Session End] ${player} played ${session.game.toUpperCase()} for ${duration} minutes (Total: ${stats.totalMinutes}m)`);
        }
        
        this.activeSessions.delete(player);
      }
    }

    // Keep last 10000 sessions to prevent memory issues
    if (this.sessionRecords.length > 10000) {
      this.sessionRecords = this.sessionRecords.slice(-10000);
    }
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
        ((analytics.averagePlayers * (analytics.appearances - 1)) + lobby.player_count) / 
        analytics.appearances;
    }
  }

  private trackSocialConnections(snapshot: ActivitySnapshot): void {
    const games: Array<{ game: 'ae' | 'apoc' | 'pr' | 'mv'; players: string[] }> = [
      { game: 'ae', players: snapshot.ae.players },
      { game: 'apoc', players: snapshot.apoc.players },
      { game: 'pr', players: snapshot.pr.players },
      { game: 'mv', players: snapshot.mv.players },
    ];

    for (const { players } of games) {
      if (players.length < 2) continue;

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        let social = this.socialConnections.get(player);
        if (!social) {
          social = {
            coPlayers: new Map(),
            lobbiesCreated: 0,
            lobbiesJoined: 0,
            mostFrequentPartner: '',
          };
          this.socialConnections.set(player, social);
        }

        for (let j = 0; j < players.length; j++) {
          if (i !== j) {
            const coPlayer = players[j];
            social.coPlayers.set(coPlayer, (social.coPlayers.get(coPlayer) || 0) + 1);
          }
        }

        // Update most frequent partner
        let maxCount = 0;
        for (const [coPlayer, count] of social.coPlayers.entries()) {
          if (count > maxCount) {
            maxCount = count;
            social.mostFrequentPartner = coPlayer;
          }
        }
      }
    }
  }

  private recordPlayerActivity(game: 'ae' | 'apoc' | 'pr' | 'mv', players: string[]): void {
    const now = Date.now();
    const hour = new Date(now).getHours();
    const day = new Date(now).getDay();

    for (const player of players) {
      // Get or create player stats
      let stats = this.playerStats.get(player);
      if (!stats) {
        stats = {
          totalSessions: 0,
          totalMinutes: 0,
          lastSeen: now,
          firstSeen: now,
          games: { ae: 0, apoc: 0, pr: 0, mv: 0 },
          peakHours: {},
          peakDays: {},
          lobbiesJoined: [],
          playtimeByGame: { ae: 0, apoc: 0, pr: 0, mv: 0 },
          averageSessionLength: 0,
          longestSession: 0,
        };
        this.playerStats.set(player, stats);
      }

      // Update stats
      stats.lastSeen = now;
      stats.games[game]++;
      stats.peakHours[hour] = (stats.peakHours[hour] || 0) + 1;
      stats.peakDays[day] = (stats.peakDays[day] || 0) + 1;
    }
  }

  public getPlayerStats(playerName: string): PlayerStatistics | null {
    return this.playerStats.get(playerName) || null;
  }

  public getTopPlayers(limit: number = 10): Array<{ name: string; stats: PlayerStatistics }> {
    return Array.from(this.playerStats.entries())
      .map(([name, stats]) => ({ name, stats }))
      .sort((a, b) => {
        const aTotal = a.stats.games.ae + a.stats.games.apoc + a.stats.games.pr + a.stats.games.mv;
        const bTotal = b.stats.games.ae + b.stats.games.apoc + b.stats.games.pr + b.stats.games.mv;
        return bTotal - aTotal;
      })
      .slice(0, limit);
  }

  public getSnapshots(hours: number = 24): ActivitySnapshot[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.snapshots.filter(s => s.timestamp >= cutoff);
  }

  public getPeakTimes(): { hour: number; count: number }[] {
    const hourlyUniquePlayers = new Map<number, Set<string>>();

    for (const snapshot of this.snapshots) {
      const hour = new Date(snapshot.timestamp).getHours();
      if (!hourlyUniquePlayers.has(hour)) {
        hourlyUniquePlayers.set(hour, new Set());
      }
      const playerSet = hourlyUniquePlayers.get(hour)!;
      
      // Add all unique players from this snapshot
      snapshot.ae.players.forEach(p => playerSet.add(p));
      snapshot.apoc.players.forEach(p => playerSet.add(p));
      snapshot.pr.players.forEach(p => playerSet.add(p));
      snapshot.mv.players.forEach(p => playerSet.add(p));
    }

    return Array.from(hourlyUniquePlayers.entries())
      .map(([hour, players]) => ({ hour, count: players.size }))
      .sort((a, b) => a.hour - b.hour);
  }

  public getDailyActivity(days: number = 7): Map<string, number> {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const dailyActivity = new Map<string, number>();

    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp < cutoff) continue;

      const date = new Date(snapshot.timestamp).toISOString().split('T')[0];
      dailyActivity.set(date, (dailyActivity.get(date) || 0) + snapshot.totalPlayers);
    }

    return dailyActivity;
  }

  public getPopularLobbies(limit: number = 10): LobbyAnalytics[] {
    return Array.from(this.lobbyTracking.values())
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, limit);
  }

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

    // Calculate streak
    const sortedSessions = sessions.sort((a, b) => a.sessionStart - b.sessionStart);
    let currentStreak = 1;
    for (let i = 1; i < sortedSessions.length; i++) {
      const dayDiff = Math.floor((sortedSessions[i].sessionStart - sortedSessions[i - 1].sessionStart) / (24 * 60 * 60 * 1000));
      if (dayDiff <= 1) currentStreak++;
      else currentStreak = 1;
    }

    return {
      totalSessions: sessions.length,
      averageSessionLength: totalDuration / sessions.length,
      longestSession: Math.max(...durations),
      shortestSession: Math.min(...durations),
      streakDays: currentStreak,
      lastSessionDate: sessions[sessions.length - 1].sessionEnd,
    };
  }

  public getRetentionMetrics(days: number = 7): RetentionMetrics {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentSessions = this.sessionRecords.filter(s => s.sessionStart >= cutoff);
    
    const newPlayers = new Set<string>();
    const returningPlayers = new Set<string>();

    for (const session of recentSessions) {
      const allSessions = this.sessionRecords.filter(s => s.playerName === session.playerName);
      if (allSessions[0].sessionStart >= cutoff) {
        newPlayers.add(session.playerName);
      } else {
        returningPlayers.add(session.playerName);
      }
    }

    const totalPlayers = newPlayers.size + returningPlayers.size;
    const retentionRate = totalPlayers > 0 ? (returningPlayers.size / totalPlayers) * 100 : 0;
    const churnRate = 100 - retentionRate;

    return {
      newPlayers: newPlayers.size,
      returningPlayers: returningPlayers.size,
      retentionRate,
      churnRate,
    };
  }

  public predictPeakTime(): PredictiveData | null {
    if (this.snapshots.length < 24) return null;

    const hourCounts: number[] = Array(24).fill(0);
    const hourTotals: number[] = Array(24).fill(0);

    for (const snapshot of this.snapshots) {
      const hour = new Date(snapshot.timestamp).getHours();
      hourCounts[hour]++;
      hourTotals[hour] += snapshot.totalPlayers;
    }

    const hourAverages = hourTotals.map((total, i) => hourCounts[i] > 0 ? total / hourCounts[i] : 0);
    const maxAvg = Math.max(...hourAverages);
    const peakHour = hourAverages.indexOf(maxAvg);

    // Calculate trend
    const recentAvg = this.snapshots.slice(-12).reduce((sum, s) => sum + s.totalPlayers, 0) / 12;
    const olderAvg = this.snapshots.slice(-24, -12).reduce((sum, s) => sum + s.totalPlayers, 0) / 12;
    const trend = recentAvg > olderAvg * 1.1 ? 'increasing' : recentAvg < olderAvg * 0.9 ? 'decreasing' : 'stable';

    return {
      expectedPeakTime: peakHour,
      expectedPlayerCount: Math.round(maxAvg),
      confidence: Math.min(95, (this.snapshots.length / 100) * 100),
      trend,
    };
  }

  public getSocialStats(playerName: string): SocialStats | null {
    return this.socialConnections.get(playerName) || null;
  }

  public getMostSocialPlayers(limit: number = 10): Array<{ name: string; uniqueCoPlayers: number }> {
    return Array.from(this.socialConnections.entries())
      .map(([name, stats]) => ({ name, uniqueCoPlayers: stats.coPlayers.size }))
      .sort((a, b) => b.uniqueCoPlayers - a.uniqueCoPlayers)
      .slice(0, limit);
  }

  public getCrossGamePlayers(): string[] {
    const result: string[] = [];
    for (const [player, stats] of this.playerStats.entries()) {
      const gamesPlayed = Object.values(stats.games).filter(count => count > 0).length;
      if (gamesPlayed >= 4) {
        result.push(player);
      }
    }
    return result;
  }

  public getWeekOverWeekGrowth(): { growth: number; percentChange: number } {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

    const thisWeek = this.snapshots.filter(s => s.timestamp >= oneWeekAgo);
    const lastWeek = this.snapshots.filter(s => s.timestamp >= twoWeeksAgo && s.timestamp < oneWeekAgo);

    const thisWeekTotal = thisWeek.reduce((sum, s) => sum + s.totalPlayers, 0);
    const lastWeekTotal = lastWeek.reduce((sum, s) => sum + s.totalPlayers, 0);

    const growth = thisWeekTotal - lastWeekTotal;
    const percentChange = lastWeekTotal > 0 ? (growth / lastWeekTotal) * 100 : 0;

    return { growth, percentChange };
  }

  public getMonthlyActivePlayers(): number {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeThisMonth = new Set<string>();

    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp >= cutoff) {
        snapshot.ae.players.forEach(p => activeThisMonth.add(p));
        snapshot.apoc.players.forEach(p => activeThisMonth.add(p));
        snapshot.pr.players.forEach(p => activeThisMonth.add(p));
        snapshot.mv.players.forEach(p => activeThisMonth.add(p));
      }
    }

    return activeThisMonth.size;
  }

  public getActivityHeatmap(): Map<string, number> {
    const heatmap = new Map<string, number>();

    for (const snapshot of this.snapshots) {
      const date = new Date(snapshot.timestamp);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;
      heatmap.set(key, (heatmap.get(key) || 0) + snapshot.totalPlayers);
    }

    return heatmap;
  }

  public getLongestActiveStreak(): { player: string; days: number } | null {
    let longest = { player: '', days: 0 };

    for (const [player, _] of this.playerStats.entries()) {
      const sessions = this.sessionRecords
        .filter(s => s.playerName === player)
        .sort((a, b) => a.sessionStart - b.sessionStart);

      if (sessions.length === 0) continue;

      let currentStreak = 1;
      let maxStreak = 1;

      for (let i = 1; i < sessions.length; i++) {
        const dayDiff = Math.floor((sessions[i].sessionStart - sessions[i - 1].sessionStart) / (24 * 60 * 60 * 1000));
        if (dayDiff <= 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      if (maxStreak > longest.days) {
        longest = { player, days: maxStreak };
      }
    }

    return longest.days > 0 ? longest : null;
  }

  public getWeekdayPatterns(): Map<number, { day: string; averagePlayers: number }> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayUniquePlayers = new Map<number, Set<string>>();
    const dayCounts = new Map<number, number>();

    for (const snapshot of this.snapshots) {
      const day = new Date(snapshot.timestamp).getDay();
      if (!dayUniquePlayers.has(day)) {
        dayUniquePlayers.set(day, new Set());
      }
      const playerSet = dayUniquePlayers.get(day)!;
      
      // Add unique players
      snapshot.ae.players.forEach(p => playerSet.add(p));
      snapshot.apoc.players.forEach(p => playerSet.add(p));
      snapshot.pr.players.forEach(p => playerSet.add(p));
      snapshot.mv.players.forEach(p => playerSet.add(p));
      
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    }

    const result = new Map<number, { day: string; averagePlayers: number }>();
    for (let i = 0; i < 7; i++) {
      const uniquePlayers = dayUniquePlayers.get(i)?.size || 0;
      const count = dayCounts.get(i) || 0;
      result.set(i, {
        day: dayNames[i],
        averagePlayers: count > 0 ? uniquePlayers / count : 0
      });
    }

    return result;
  }

  public getMostActiveLeaderboard(limit: number = 10): Array<{ name: string; totalActivity: number; playtime: number }> {
    return Array.from(this.playerStats.entries())
      .map(([name, stats]) => ({
        name,
        totalActivity: stats.games.ae + stats.games.apoc + stats.games.pr + stats.games.mv,
        playtime: stats.totalMinutes
      }))
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, limit);
  }

  public getLongestStreakLeaderboard(limit: number = 10): Array<{ name: string; streakDays: number }> {
    const streaks: Array<{ name: string; streakDays: number }> = [];

    for (const [player, _] of this.playerStats.entries()) {
      const sessions = this.sessionRecords
        .filter(s => s.playerName === player)
        .sort((a, b) => a.sessionStart - b.sessionStart);

      if (sessions.length === 0) continue;

      let currentStreak = 1;
      let maxStreak = 1;

      for (let i = 1; i < sessions.length; i++) {
        const dayDiff = Math.floor((sessions[i].sessionStart - sessions[i - 1].sessionStart) / (24 * 60 * 60 * 1000));
        if (dayDiff <= 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      streaks.push({ name: player, streakDays: maxStreak });
    }

    return streaks.sort((a, b) => b.streakDays - a.streakDays).slice(0, limit);
  }

  public getMostDiverseLeaderboard(limit: number = 10): Array<{ name: string; gamesPlayed: number }> {
    return Array.from(this.playerStats.entries())
      .map(([name, stats]) => ({
        name,
        gamesPlayed: Object.values(stats.games).filter(count => count > 0).length
      }))
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .slice(0, limit);
  }

  public getMostSocialLeaderboard(limit: number = 10): Array<{ name: string; uniquePartners: number }> {
    return Array.from(this.socialConnections.entries())
      .map(([name, stats]) => ({
        name,
        uniquePartners: stats.coPlayers.size
      }))
      .sort((a, b) => b.uniquePartners - a.uniquePartners)
      .slice(0, limit);
  }

  public getLobbyAnalytics(): {
    totalLobbies: number;
    averageDuration: number;
    topHosts: Array<{ host: string; count: number }>;
    popularLobbies: Array<{ name: string; count: number }>;
  } {
    const lobbies = Array.from(this.lobbyTracking.values());
    const totalLobbies = lobbies.length;
    const avgDuration = lobbies.length > 0 
      ? lobbies.reduce((sum, l) => sum + l.averageDuration, 0) / lobbies.length 
      : 0;

    const hostCounts = new Map<string, number>();
    const lobbyCounts = new Map<string, number>();

    for (const lobby of lobbies) {
      lobbyCounts.set(lobby.lobbyName, lobby.appearances);
      const hostMatch = lobby.lobbyName.match(/^([^']+)'s/);
      if (hostMatch) {
        const host = hostMatch[1];
        hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
      }
    }

    const topHosts = Array.from(hostCounts.entries())
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const popularLobbies = Array.from(lobbyCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalLobbies,
      averageDuration: avgDuration,
      topHosts,
      popularLobbies,
    };
  }

  public getSessionAnalytics(): {
    totalSessions: number;
    averageLength: number;
    longestSession: { player: string; duration: number } | null;
  } {
    if (this.sessionRecords.length === 0) {
      return {
        totalSessions: 0,
        averageLength: 0,
        longestSession: null,
      };
    }

    const totalLength = this.sessionRecords.reduce((sum, s) => sum + s.duration, 0);
    const avgLength = totalLength / this.sessionRecords.length;
    const longest = this.sessionRecords.reduce((max, s) => s.duration > max.duration ? s : max);

    return {
      totalSessions: this.sessionRecords.length,
      averageLength: avgLength,
      longestSession: { player: longest.playerName, duration: longest.duration },
    };
  }

  public getGrowthTrends(days: number = 30): {
    dailyPlayers: Map<string, number>;
    weekOverWeekGrowth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const dailyPlayers = new Map<string, Set<string>>();

    for (const snapshot of this.snapshots) {
      if (snapshot.timestamp < cutoff) continue;

      const date = new Date(snapshot.timestamp).toISOString().split('T')[0];
      if (!dailyPlayers.has(date)) {
        dailyPlayers.set(date, new Set());
      }
      const daySet = dailyPlayers.get(date)!;
      snapshot.ae.players.forEach(p => daySet.add(p));
      snapshot.apoc.players.forEach(p => daySet.add(p));
      snapshot.pr.players.forEach(p => daySet.add(p));
      snapshot.mv.players.forEach(p => daySet.add(p));
    }

    const dailyCount = new Map<string, number>();
    for (const [date, players] of dailyPlayers.entries()) {
      dailyCount.set(date, players.size);
    }

    const { percentChange } = this.getWeekOverWeekGrowth();
    const trend = percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable';

    return {
      dailyPlayers: dailyCount,
      weekOverWeekGrowth: percentChange,
      trend,
    };
  }

  public getAverageStatistics(): AverageStatistics {
    const lobbies = Array.from(this.lobbyTracking.values());
    const allPlayers = Array.from(this.playerStats.values());

    const avgLobbySize = lobbies.length > 0
      ? lobbies.reduce((sum, l) => sum + l.averagePlayers, 0) / lobbies.length
      : 0;
    
    const avgLobbyDuration = lobbies.length > 0
      ? lobbies.reduce((sum, l) => sum + l.averageDuration, 0) / lobbies.length
      : 0;

    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();
    
    for (const snapshot of this.snapshots) {
      const hour = new Date(snapshot.timestamp).getHours();
      const day = new Date(snapshot.timestamp).getDay();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + snapshot.totalPlayers);
      dayCounts.set(day, (dayCounts.get(day) || 0) + snapshot.totalPlayers);
    }

    const mostPopularHour = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    
    const mostPopularDay = Array.from(dayCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    const avgSessionLength = this.sessionRecords.length > 0
      ? this.sessionRecords.reduce((sum, s) => sum + s.duration, 0) / this.sessionRecords.length
      : 0;

    const avgSessionsPerPlayer = allPlayers.length > 0
      ? allPlayers.reduce((sum, p) => sum + p.totalSessions, 0) / allPlayers.length
      : 0;

    const totalPlaytime = allPlayers.reduce((sum, p) => sum + p.totalMinutes, 0);
    const avgPlaytimePerPlayer = allPlayers.length > 0 ? totalPlaytime / allPlayers.length : 0;

    const collectionDays = Math.max(1, Math.floor((Date.now() - this.snapshots[0]?.timestamp || Date.now()) / (24 * 60 * 60 * 1000)));
    const avgDailyPlaytime = totalPlaytime / Math.max(1, collectionDays);
    const avgWeeklyPlaytime = avgDailyPlaytime * 7;

    const avgGamesPerPlayer = allPlayers.length > 0
      ? allPlayers.reduce((sum, p) => sum + Object.values(p.games).filter(g => g > 0).length, 0) / allPlayers.length
      : 0;

    return {
      lobbies: {
        averageSize: avgLobbySize,
        averageDuration: avgLobbyDuration,
        mostPopularTime: mostPopularHour,
        mostPopularDay: mostPopularDay,
      },
      sessions: {
        averageLength: avgSessionLength,
        averagePlayersPerSession: avgLobbySize,
        averageSessionsPerPlayer: avgSessionsPerPlayer,
      },
      playtime: {
        averageDailyPlaytime: avgDailyPlaytime,
        averageWeeklyPlaytime: avgWeeklyPlaytime,
        mostActiveHour: mostPopularHour,
        mostActiveDay: mostPopularDay,
      },
      players: {
        averageSessionsPerPlayer: avgSessionsPerPlayer,
        averagePlaytimePerPlayer: avgPlaytimePerPlayer,
        averageGamesPerPlayer: avgGamesPerPlayer,
      },
    };
  }
}
