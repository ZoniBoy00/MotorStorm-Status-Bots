import { ApiClient } from '../../core';
import { ServerData, Lobby } from '../../types';

/**
 * Types specific to PSRewired API
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

/**
 * API handler for MotorStorm Pacific Rift server data
 */
export class PRApiHandler extends ApiClient {
  private readonly APP_ID = '21624';
  private readonly BASE_URL = 'https://api.psrewired.com/us/api';

  constructor() {
    super('MotorStorm-PR');
  }

  /**
   * Parse player name by removing numeric prefixes and special characters
   */
  private parsePlayerName(name: string | null | undefined): string {
    if (!name) return 'Unknown';

    // Handle format like "fffff7fb-ZoniBoy0"
    if (name.includes('-')) {
      return name.split('-')[1].trim();
    }

    // Handle format with hex prefix
    const match = name.match(/[0-9a-f]+-(.+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Handle format with just hex prefix without dash
    const hexPrefixMatch = name.match(/^[0-9a-f]{8,}(.+)/i);
    if (hexPrefixMatch && hexPrefixMatch[1]) {
      return hexPrefixMatch[1].trim();
    }

    return name.trim();
  }

  /**
   * Process rooms data and extract lobby information
   */
  private async processRooms(
    roomsData: PSRRoom[],
    _allPlayers: string[],
    _debug: boolean = false
  ): Promise<Lobby[]> {
    const lobbies: Lobby[] = [];

    for (const room of roomsData) {
      try {
        const roomId = room.id;
        const baseRoomName = room.name || 'Unknown Lobby';
        const playerCount = room.playerCount || 0;
        const maxPlayers = room.maxPlayers || 12;

        // Fetch player data for this specific room
        const roomPlayersData = await this.fetchWithRetry<PSRRoomDetail[] | PSRRoomDetail>(
          `${this.BASE_URL}/rooms/${roomId}`
        );

        if (!roomPlayersData) {
          continue;
        }

        // Handle the case where the room contains multiple sub-lobbies
        if (Array.isArray(roomPlayersData) && roomPlayersData.length > 0) {
          for (const subLobby of roomPlayersData) {
            const lobbyName = subLobby.name || baseRoomName;
            const lobbyPlayerCount = subLobby.playerCount || 0;
            const lobbyMaxPlayers = subLobby.maxPlayers || maxPlayers;

            let lobbyPlayers: string[] = [];
            if (subLobby.players && Array.isArray(subLobby.players)) {
              lobbyPlayers = subLobby.players.map((player) =>
                this.parsePlayerName(player.name)
              );
            }

            lobbies.push({
              name: lobbyName,
              player_count: lobbyPlayerCount,
              max_players: lobbyMaxPlayers,
              players: lobbyPlayers,
              is_active: lobbyPlayerCount > 0,
            });
          }
        } else if (
          typeof roomPlayersData === 'object' &&
          !Array.isArray(roomPlayersData) &&
          roomPlayersData.players
        ) {
          // Single lobby format
          const lobbyPlayers = roomPlayersData.players.map((player) =>
            this.parsePlayerName(player.name)
          );

          lobbies.push({
            name: roomPlayersData.name || baseRoomName,
            player_count: roomPlayersData.playerCount || playerCount,
            max_players: roomPlayersData.maxPlayers || maxPlayers,
            players: lobbyPlayers,
            is_active: (roomPlayersData.playerCount || playerCount) > 0,
          });
        } else if (playerCount === 0) {
          // Empty room
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
          name: room.name || 'Unknown Lobby',
          player_count: room.playerCount || 0,
          max_players: room.maxPlayers || 12,
          players: [],
          is_active: (room.playerCount || 0) > 0,
        });
      }
    }

    return lobbies;
  }

  /**
   * Fetch server data for MotorStorm Pacific Rift
   */
  async fetchData(): Promise<ServerData | null> {
    try {
      const [prRoomsData, prPlayersData, prUniverseData] = await Promise.all([
        this.fetchWithRetry<PSRRoom[]>(
          `${this.BASE_URL}/rooms?applicationId=${this.APP_ID}`
        ),
        this.fetchWithRetry<PSRPlayer[]>(
          `${this.BASE_URL}/universes/players?applicationId=${this.APP_ID}`
        ),
        this.fetchWithRetry<PSRUniverse[]>(
          `${this.BASE_URL}/universes?applicationId=${this.APP_ID}`
        ),
      ]);

      if (!prRoomsData || !prPlayersData || !prUniverseData) {
        return null;
      }

      const parsedPlayers = prPlayersData.map((player) => this.parsePlayerName(player.name));
      const universeInfo = prUniverseData[0];

      const prLobbies = await this.processRooms(prRoomsData, parsedPlayers, false);

      const uniquePlayers = [...new Set(parsedPlayers)];
      const totalPlayers = uniquePlayers.length;

      return {
        motorstorm_pr: {
          general_lobby: {
            name: universeInfo.name || 'Pacific Rift',
            player_count: uniquePlayers.length,
            players: uniquePlayers,
          },
          lobbies: prLobbies,
          summary: {
            active_lobbies: prLobbies.filter((lobby) => lobby.is_active).length,
            total_players: totalPlayers,
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
