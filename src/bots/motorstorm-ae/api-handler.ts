import { ApiClient } from '../../core';
import { ServerData, XMLPlayer, XMLLobby, LobbyConfig, Lobby } from '../../types';
import { simplifyName } from '../../utils';

/**
 * API handler for MotorStorm Arctic Edge server data
 */
export class AEApiHandler extends ApiClient {
  private readonly APP_ID = '22204';
  private readonly BASE_URL = 'https://svo.agracingfoundation.org/medius_db/api';

  constructor() {
    super('MotorStorm-AE');
  }

  /**
   * Parse lobby configuration from ConfigShortcut section
   */
  private parseLobbyConfig(lobby: XMLLobby): LobbyConfig {
    const config: LobbyConfig = {
      gameMode: null,
      lapCount: null,
      track: null,
      direction: null,
    };

    if (lobby.ConfigShortcut) {
      const shortcut = lobby.ConfigShortcut;
      config.gameMode = shortcut.GameMode || null;
      config.lapCount = shortcut.LapCount || null;
      config.track = shortcut.Track || null;
      config.direction = shortcut.Direction || null;
    }

    return config;
  }

  /**
   * Extract player name from various possible XML structures
   */
  private extractPlayerName(player: XMLPlayer): string | null {
    let playerName: string | null = null;

    // Check $ attributes first
    if (player.$) {
      playerName =
        player.$.AccountName ||
        player.$.accountName ||
        player.$.name ||
        player.$.Name ||
        null;
    }

    // If not found in $, check direct properties
    if (!playerName) {
      playerName =
        player.AccountName ||
        player.accountName ||
        player.name ||
        player.Name ||
        null;
    }

    // If still not found, check for nested structures
    if (!playerName && player.Account) {
      playerName = player.Account.Name || player.Account.name || null;
    }

    return playerName ? simplifyName(playerName) : null;
  }

  /**
   * Fetch server data for MotorStorm Arctic Edge
   */
  async fetchData(): Promise<ServerData | null> {
    try {
      const [lobbyResponse, playerListResponse] = await Promise.all([
        this.fetchWithRetry<string>(
          `${this.BASE_URL}/GetLobbyListing?AppId=${this.APP_ID}`
        ),
        this.fetchWithRetry<string>(
          `${this.BASE_URL}/GetPlayerCount?filter=FILTER_APP_ID&arg=${this.APP_ID}`
        ),
      ]);

      if (!lobbyResponse || !playerListResponse) {
        return null;
      }

      const lobbyData = await this.parseXML(lobbyResponse);
      const playerListData = await this.parseXML(playerListResponse);

      let allPlayers: string[] = [];

      if (playerListData?.GetPlayerCount?.Player) {
        const playerList = Array.isArray(playerListData.GetPlayerCount.Player)
          ? playerListData.GetPlayerCount.Player
          : [playerListData.GetPlayerCount.Player];

        allPlayers = playerList
          .map((player: XMLPlayer) => this.extractPlayerName(player))
          .filter((name: string | null): name is string => name !== null);
      }

      let lobbies: Lobby[] = [];
      const totalLobbies = parseInt(lobbyData?.GetLobbyListing?.$?.totalEntries || '0');

      if (totalLobbies > 0 && lobbyData?.GetLobbyListing?.Lobby) {
        const lobbyList = Array.isArray(lobbyData.GetLobbyListing.Lobby)
          ? lobbyData.GetLobbyListing.Lobby
          : [lobbyData.GetLobbyListing.Lobby];

        lobbies = lobbyList.map((lobby: XMLLobby) => {
          let lobbyPlayers: string[] = [];
          if (lobby.$ && lobby.$.PlayerListCurrent) {
            const playerList = lobby.$.PlayerListCurrent.split(',').map((name) =>
              name.trim()
            );
            lobbyPlayers = playerList
              .map((player) => simplifyName(player))
              .filter((name) => name);
          }

          const playerCount = parseInt(lobby.$?.PlayerCount || '0');
          const maxPlayers = parseInt(lobby.$?.MaxPlayers || '6');
          const lobbyName = lobby.$?.GameName
            ? lobby.$.GameName.split('~')[0]
            : 'Unknown Lobby';
          const config = this.parseLobbyConfig(lobby);

          return {
            name: lobbyName,
            player_count: playerCount,
            max_players: maxPlayers,
            players: lobbyPlayers,
            is_active: playerCount > 0,
            config,
          };
        });
      }

      allPlayers = [...new Set(allPlayers)].filter((name) => name);

      const activeLobbies = lobbies.filter((lobby) => lobby.is_active).length;

      return {
        motorstorm_ae: {
          general_lobby: {
            name: 'MotorStorm Arctic Edge',
            player_count: allPlayers.length,
            players: allPlayers,
          },
          lobbies,
          summary: {
            active_lobbies: activeLobbies,
            total_players: allPlayers.length,
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
