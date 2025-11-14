import { ApiClient } from '../../core';
import { ServerData, Lobby } from '../../types';

/**
 * Types specific to MotorStorm Apocalypse API
 */
interface ApocClient {
  Name?: string;
  PlayerName?: string;
}

interface ApocGameSession {
  Name?: string;
  Clients?: ApocClient[];
  PlayerCount?: number;
}

interface ApocWorld {
  WorldId?: string | number;
  GameSessions?: ApocGameSession[];
}

interface ApocEntry {
  AppId: string | number;
  Worlds?: ApocWorld[];
}

/**
 * API handler for MotorStorm Apocalypse server data
 */
export class ApocApiHandler extends ApiClient {
  private readonly APP_ID = '22500';
  private readonly API_URL = 'http://api.psorg-web-revival.us:61920/GetRooms/';

  constructor() {
    super('MotorStorm-Apoc');
  }

  /**
   * Remove UUID prefixes from strings (e.g., "fffff7fb-ZoniBoy0" -> "ZoniBoy0")
   */
  private removeUuidPrefix(str: string | null | undefined): string {
    if (!str || typeof str !== 'string') return '';

    const uuidPrefixMatch = str.match(/^[0-9a-f]+-/i);
    if (uuidPrefixMatch) {
      return str.substring(uuidPrefixMatch[0].length).trim();
    }

    return str.trim();
  }

  /**
   * Parse player name by removing UUID prefixes
   */
  private parsePlayerName(name: string | null | undefined): string {
    return this.removeUuidPrefix(name);
  }

  /**
   * Process game sessions into lobby information
   */
  private processGameSessions(gameSessions: any[]): Lobby[] {
    if (!gameSessions || gameSessions.length === 0) {
      return [];
    }

    return gameSessions.map((session) => {
      let sessionName = session.Name || `Game Session (World ${session.WorldId})`;
      sessionName = this.removeUuidPrefix(sessionName);

      const playerCount = session.Players ? session.Players.length : session.PlayerCount || 0;
      const maxPlayers = 16;
      const isActive = playerCount > 0;

      return {
        name: sessionName,
        player_count: playerCount,
        max_players: maxPlayers,
        players: session.Players || [],
        is_active: isActive,
      };
    });
  }

  /**
   * Create an empty response for when the server is offline
   */
  private createEmptyResponse(): ServerData {
    return {
      motorstorm_msa: {
        general_lobby: {
          name: 'MotorStorm Apocalypse',
          player_count: 0,
          players: [],
        },
        lobbies: [],
        summary: {
          active_lobbies: 0,
          total_players: 0,
        },
      },
    };
  }

  /**
   * Fetch server data for MotorStorm Apocalypse
   */
  async fetchData(): Promise<ServerData | null> {
    try {
      const response = await this.fetchWithRetry<ApocEntry[]>(this.API_URL);
      if (!response) {
        return this.createEmptyResponse();
      }

      const msaEntry = response.find(
        (entry) => entry.AppId === this.APP_ID || entry.AppId === 22500
      );

      if (!msaEntry) {
        return this.createEmptyResponse();
      }

      const worlds = msaEntry.Worlds || [];
      const allGameSessions: any[] = [];
      let allPlayers: string[] = [];

      worlds.forEach((world) => {
        const worldId = world.WorldId || 'Unknown';
        const gameSessions = world.GameSessions || [];

        gameSessions.forEach((session) => {
          const processedSession: any = {
            ...session,
            WorldId: worldId,
            PlayerCount: 0,
            Players: [],
          };

          if (session.Clients && Array.isArray(session.Clients)) {
            const sessionPlayers = session.Clients.map((client) => {
              const name = client.Name || client.PlayerName || '';
              return this.parsePlayerName(name);
            }).filter((name) => name);

            processedSession.Players = sessionPlayers;
            processedSession.PlayerCount = sessionPlayers.length;
            allPlayers = allPlayers.concat(sessionPlayers);
          }

          allGameSessions.push(processedSession);
        });
      });

      allPlayers = [...new Set(allPlayers)].filter((name) => name);

      const lobbies = this.processGameSessions(allGameSessions);

      const totalPlayers = allPlayers.length;
      const activeLobbies = lobbies.filter((lobby) => lobby.is_active).length;

      return {
        motorstorm_msa: {
          general_lobby: {
            name: 'MotorStorm Apocalypse',
            player_count: totalPlayers,
            players: allPlayers,
          },
          lobbies,
          summary: {
            active_lobbies: activeLobbies,
            total_players: totalPlayers,
          },
        },
      };
    } catch (error) {
      const err = error as Error;
      console.error('Error fetching server data:', err.message);
      return this.createEmptyResponse();
    }
  }
}
