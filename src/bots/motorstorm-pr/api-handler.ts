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

    // Handle format like "fffff7fb-ZoniBoy0" or "0-ZoniBoy0"
    // The name is always after the first dash if there is one and it's a hex prefix
    const dashIndex = name.indexOf('-');
    if (dashIndex !== -1) {
      const prefix = name.substring(0, dashIndex);
      // Check if prefix looks like a hex/number (PSR prefix)
      if (/^[0-9a-f]+$/i.test(prefix)) {
        return name.substring(dashIndex + 1).trim();
      }
    }

    // Fallback: handle format with just hex prefix without dash (8+ chars)
    const hexPrefixMatch = name.match(/^[0-9a-f]{8,}(.+)/i);
    if (hexPrefixMatch && hexPrefixMatch[1]) {
      return hexPrefixMatch[1].trim();
    }

    return name.trim();
  }

  /**
   * Parse lobby configuration from room name
   */
  private parseLobbyConfig(roomName: string): any {
    if (!roomName.includes('~')) return null;

    const parts = roomName.split('~').map(p => p.trim());
    return {
      gameMode: parts[0] || null,
      track: parts[1] || null,
      lapCount: parts[2] || null,
      direction: parts[3] || null,
    };
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
              config: this.parseLobbyConfig(lobbyName),
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
            config: this.parseLobbyConfig(roomPlayersData.name || baseRoomName),
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
        ).catch(() => [] as PSRRoom[]),
        this.fetchWithRetry<PSRPlayer[]>(
          `${this.BASE_URL}/universes/players?applicationId=${this.APP_ID}`
        ).catch(() => [] as PSRPlayer[]),
        this.fetchWithRetry<PSRUniverse[]>(
          `${this.BASE_URL}/universes?applicationId=${this.APP_ID}`
        ).catch(() => [] as PSRUniverse[]),
      ]);

      if (!prRoomsData && !prPlayersData) {
        return null;
      }

      const rooms = prRoomsData || [];
      const players = prPlayersData || [];
      const universeInfo = (prUniverseData && prUniverseData.length > 0)
        ? prUniverseData[0]
        : { name: 'MotorStorm Pacific Rift' };

      const parsedPlayers = players.map((player) => this.parsePlayerName(player.name));
      const prLobbies = await this.processRooms(rooms, parsedPlayers, false);

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
