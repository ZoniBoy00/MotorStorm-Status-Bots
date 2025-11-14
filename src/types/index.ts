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
