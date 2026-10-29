import { ApiClient } from './api-client';
import { ServerData, Lobby, LobbyConfig } from '../types';

/**
 * Types for PSRewired API (shared by Apoc, PR and MV bots)
 */
interface PSRPlayer {
  name: string;
}

interface PSRRoom {
  id: number | string;
  name?: string;
  playerCount?: number;
  maxPlayers?: number;
}

interface PSRRoomDetail {
  name?: string;
  playerCount?: number;
  maxPlayers?: number;
  players?: PSRPlayer[];
}

interface PSRUniverse {
  name?: string;
  playerCount?: number;
}

export interface PSRewiredGameOptions {
  /** PSRewired application ID */
  appId: string;
  /** Logger name, e.g. "MotorStorm-Apoc" */
  botName: string;
  /** Key in the returned ServerData, e.g. "motorstorm_apoc" */
  dataKey: string;
  /** Fallback name when the universe endpoint returns nothing */
  defaultName: string;
  /** Fallback lobby size when the API omits maxPlayers */
  defaultMaxPlayers: number;
}

export const PSREWIRED_BASE_URL = 'https://api.psrewired.com/us/api';

/**
 * Parse player name by removing PSR hex prefixes, e.g. "fffff7fb-ZoniBoy0" or "0-ZoniBoy0"
 */
export function parsePsrPlayerName(name: string | null | undefined): string {
  if (!name) return 'Unknown';

  // The name is after the first dash if the part before it is a hex prefix
  const dashIndex = name.indexOf('-');
  if (dashIndex !== -1) {
    const prefix = name.substring(0, dashIndex);
    if (/^[0-9a-f]+$/i.test(prefix)) {
      return name.substring(dashIndex + 1).trim();
    }
  }

  // Fallback: hex prefix without dash (8+ chars)
  const hexPrefixMatch = name.match(/^[0-9a-f]{8,}(.+)/i);
  if (hexPrefixMatch && hexPrefixMatch[1]) {
    return hexPrefixMatch[1].trim();
  }

  return name.trim();
}

/**
 * Parse lobby configuration from a room name like "Race ~ Track ~ 3 ~ Forward"
 */
export function parsePsrLobbyConfig(roomName: string): LobbyConfig | undefined {
  if (!roomName.includes('~')) return undefined;

  const parts = roomName.split('~').map((part) => part.trim());
  return {
    gameMode: parts[0] || null,
    track: parts[1] || null,
    lapCount: parts[2] || null,
    direction: parts[3] || null,
  };
}

/**
 * API handler for MotorStorm games hosted on PSRewired
 */
export class PSRewiredApiHandler extends ApiClient {
  private readonly options: PSRewiredGameOptions;

  constructor(options: PSRewiredGameOptions) {
    super(options.botName);
    this.options = options;
  }

  private toLobby(name: string, playerCount: number, maxPlayers: number, players: string[]): Lobby {
    return {
      name,
      player_count: playerCount,
      max_players: maxPlayers,
      players,
      is_active: playerCount > 0,
      config: parsePsrLobbyConfig(name),
    };
  }

  /**
   * Process rooms data and extract lobby information
   */
  private async processRooms(roomsData: PSRRoom[]): Promise<Lobby[]> {
    const lobbies: Lobby[] = [];

    for (const room of roomsData) {
      const baseRoomName = room.name || 'Unknown Lobby';
      const playerCount = room.playerCount || 0;
      const maxPlayers = room.maxPlayers || this.options.defaultMaxPlayers;

      try {
        // Fetch player data for this specific room
        const roomPlayersData = await this.fetchWithRetry<PSRRoomDetail[] | PSRRoomDetail>(
          `${PSREWIRED_BASE_URL}/rooms/${encodeURIComponent(String(room.id))}`
        );

        if (!roomPlayersData) {
          continue;
        }

        if (Array.isArray(roomPlayersData) && roomPlayersData.length > 0) {
          // The room contains multiple sub-lobbies
          for (const subLobby of roomPlayersData) {
            const players = Array.isArray(subLobby.players)
              ? subLobby.players.map((player) => parsePsrPlayerName(player.name))
              : [];
            lobbies.push(this.toLobby(
              subLobby.name || baseRoomName,
              subLobby.playerCount || 0,
              subLobby.maxPlayers || maxPlayers,
              players
            ));
          }
        } else if (!Array.isArray(roomPlayersData) && roomPlayersData.players) {
          // Single lobby format
          lobbies.push(this.toLobby(
            roomPlayersData.name || baseRoomName,
            roomPlayersData.playerCount || playerCount,
            roomPlayersData.maxPlayers || maxPlayers,
            roomPlayersData.players.map((player) => parsePsrPlayerName(player.name))
          ));
        } else if (playerCount === 0) {
          lobbies.push({
            name: baseRoomName,
            player_count: 0,
            max_players: maxPlayers,
            players: [],
            is_active: false,
          });
        }
      } catch (error) {
        const err = error as Error;
        console.error(`Error processing room with ID ${room.id}: ${err.message}`);

        // Still add the lobby even if we can't fetch detailed player info
        lobbies.push({
          name: baseRoomName,
          player_count: playerCount,
          max_players: maxPlayers,
          players: [],
          is_active: playerCount > 0,
        });
      }
    }

    return lobbies;
  }

  /**
   * Fetch server data for this game
   */
  async fetchData(): Promise<ServerData | null> {
    const { appId, dataKey, defaultName } = this.options;

    try {
      const [roomsData, playersData, universeData] = await Promise.all([
        this.fetchWithRetry<PSRRoom[]>(`${PSREWIRED_BASE_URL}/rooms?applicationId=${appId}`),
        this.fetchWithRetry<PSRPlayer[]>(`${PSREWIRED_BASE_URL}/universes/players?applicationId=${appId}`),
        this.fetchWithRetry<PSRUniverse[]>(`${PSREWIRED_BASE_URL}/universes?applicationId=${appId}`),
      ]);

      if (!roomsData && !playersData) {
        return null;
      }

      const rooms = Array.isArray(roomsData) ? roomsData : [];
      const players = Array.isArray(playersData) ? playersData : [];
      const universeName = (Array.isArray(universeData) && universeData[0]?.name) || defaultName;

      const uniquePlayers = [...new Set(players.map((player) => parsePsrPlayerName(player.name)))];
      const lobbies = await this.processRooms(rooms);

      return {
        [dataKey]: {
          general_lobby: {
            name: universeName,
            player_count: uniquePlayers.length,
            players: uniquePlayers,
          },
          lobbies,
          summary: {
            active_lobbies: lobbies.filter((lobby) => lobby.is_active).length,
            total_players: uniquePlayers.length,
          },
        },
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching server data:', err.message);
      return null;
    }
  }
}
