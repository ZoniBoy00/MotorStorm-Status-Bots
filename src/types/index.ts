import { ActivityType } from 'discord.js';

// Configuration types
export interface BotConfig {
  token: string;
  channelIds: string[];
  statusCheckInterval: number;
  activityRotationInterval: number;
  debug: boolean;
  gameName: string;
  apiEndpoint: string;
  dataKey: string;
  notificationChannelId?: string;
  notificationRoleId?: string;
  notificationPingsEnabled?: boolean;
}

export interface ActivityConfig {
  type: ActivityType;
  message: string;
}

// Server data types
export interface LobbyConfig {
  gameMode: string | null;
  lapCount: string | null;
  track: string | null;
  direction: string | null;
}

export interface Lobby {
  name: string;
  player_count: number;
  max_players: number;
  players: string[];
  is_active: boolean;
  config?: LobbyConfig;
}

export interface GeneralLobby {
  name: string;
  player_count: number;
  players: string[];
}

export interface GameSummary {
  active_lobbies: number;
  total_players: number;
}

export interface GameData {
  general_lobby: GeneralLobby;
  lobbies: Lobby[];
  summary: GameSummary;
}

export interface ServerData {
  [key: string]: GameData;
}

// Message storage types
export interface MessageIdStore {
  [channelId: string]: string;
}

export interface LobbyNotification {
  lobbyName: string;
  players: string[];
  timestamp: number;
}

export interface NotificationStore {
  [channelId: string]: {
    [lobbyName: string]: LobbyNotification;
  };
}

// Logger types
export type LogType = 'info' | 'success' | 'error' | 'status' | 'warning';

// API types
export interface XMLPlayer {
  $?: {
    AccountName?: string;
    accountName?: string;
    name?: string;
    Name?: string;
  };
  AccountName?: string;
  accountName?: string;
  name?: string;
  Name?: string;
  Account?: {
    Name?: string;
    name?: string;
  };
}

export interface XMLLobby {
  $?: {
    PlayerListCurrent?: string;
    PlayerCount?: string;
    MaxPlayers?: string;
    GameName?: string;
  };
  ConfigShortcut?: {
    GameMode?: string;
    LapCount?: string;
    Track?: string;
    Direction?: string;
  };
}

// Helper bot statistics tracking types
export interface PlayerActivityRecord {
  playerName: string;
  timestamp: number;
  game: 'ae' | 'apoc' | 'pr' | 'mv';
  lobbyName: string;
}

export interface PlayerStatistics {
  totalSessions: number;
  totalMinutes: number; // Now accurately tracks total playtime
  lastSeen: number;
  firstSeen: number;
  games: {
    ae: number;
    apoc: number;
    pr: number;
    mv: number;
  };
  peakHours: { [hour: number]: number };
  peakDays: { [day: number]: number };
  lobbiesJoined: string[];
  playtimeByGame: {
    ae: number; // minutes
    apoc: number;
    pr: number;
    mv: number;
  };
  averageSessionLength: number; // minutes
  longestSession: number; // minutes
}

export interface DailyStats {
  date: string;
  totalPlayers: number;
  uniquePlayers: Set<string>;
  peakCount: number;
  peakTime: string;
  gameActivity: {
    ae: number;
    apoc: number;
    pr: number;
    mv: number;
  };
}

export interface ActivitySnapshot {
  timestamp: number;
  ae: { players: string[]; lobbies: number };
  apoc: { players: string[]; lobbies: number };
  pr: { players: string[]; lobbies: number };
  mv: { players: string[]; lobbies: number };
  totalPlayers: number;
}

export interface LobbyAnalytics {
  lobbyName: string;
  appearances: number;
  averageDuration: number; // in minutes
  averagePlayers: number;
  firstSeen: number;
  lastSeen: number;
  game: 'ae' | 'apoc' | 'pr' | 'mv';
}

export interface SessionRecord {
  playerName: string;
  game: 'ae' | 'apoc' | 'pr' | 'mv';
  sessionStart: number;
  sessionEnd: number;
  duration: number; // in minutes
}

export interface PlayerSessionStats {
  totalSessions: number;
  averageSessionLength: number;
  longestSession: number;
  shortestSession: number;
  streakDays: number;
  lastSessionDate: number;
}

export interface GameModeStats {
  mode: string;
  count: number;
  popularTracks: Map<string, number>;
  averageLaps: number;
  direction: { forward: number; reverse: number };
}

export interface SocialStats {
  coPlayers: Map<string, number>; // player name -> times played together
  lobbiesCreated: number;
  lobbiesJoined: number;
  mostFrequentPartner: string;
}

export interface RetentionMetrics {
  newPlayers: number; // players seen for first time
  returningPlayers: number; // players seen before
  retentionRate: number; // percentage
  churnRate: number; // percentage
}

export interface PredictiveData {
  expectedPeakTime: number; // hour of day
  expectedPlayerCount: number;
  confidence: number; // percentage
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface AverageStatistics {
  lobbies: {
    averageSize: number;
    averageDuration: number;
    mostPopularTime: number; // hour
    mostPopularDay: number; // 0-6
  };
  sessions: {
    averageLength: number;
    averagePlayersPerSession: number;
    averageSessionsPerPlayer: number;
  };
  playtime: {
    averageDailyPlaytime: number;
    averageWeeklyPlaytime: number;
    mostActiveHour: number;
    mostActiveDay: number;
  };
  players: {
    averageSessionsPerPlayer: number;
    averagePlaytimePerPlayer: number;
    averageGamesPerPlayer: number;
  };
}
