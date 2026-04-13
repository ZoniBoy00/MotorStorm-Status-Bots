import { EmbedBuilder } from 'discord.js';
import { ServerData } from '../../types';

/**
 * Build Discord embed for MotorStorm Apocalypse status
 */
export function buildApocEmbed(data: ServerData): EmbedBuilder {
  const msaData = data.motorstorm_apoc;

  const embed = new EmbedBuilder()
    .setTitle('MotorStorm: Apocalypse')
    .setDescription(
      `> Real-time server status and player activity\n> [View Server Dashboard](https://psrewired.com/servers/22500)`
    )
    .setColor('#ce5c2b')
    .setTimestamp(new Date())
    .setThumbnail('https://i.imgur.com/a0EtQ5i.png');

  // Add summary with better visual separation
  const summaryEmoji = msaData.summary.total_players > 0 ? '🟢' : '⚪';
  embed.addFields({
    name: `${summaryEmoji} Server Overview`,
    value: [
      `┌ **Active Lobbies:** ${msaData.summary.active_lobbies}`,
      `└ **Players Online:** ${msaData.summary.total_players}`,
    ].join('\n'),
    inline: false,
  });

  // Add general lobby status with improved formatting
  const generalPlayers = msaData.general_lobby.players;
  const generalStatus = generalPlayers.length
    ? `\`\`\`${generalPlayers.join(', ')}\`\`\``
    : '```No players currently online```';

  embed.addFields({
    name: '🌐 Main Lobby',
    value: [
      `**Players:** ${generalPlayers.length}`,
      generalStatus,
    ].join('\n'),
    inline: false,
  });

  // Add active lobbies with enhanced visual design
  if (msaData.lobbies.some((l) => l.is_active)) {
    embed.addFields({
      name: '━━━━━━━━━━━━━━━━━━━━━━',
      value: '**Active Game Lobbies**',
      inline: false,
    });

    for (const lobby of msaData.lobbies) {
      if (!lobby.is_active) continue;

      const status = lobby.player_count > 0 ? '🟢 ACTIVE' : '⚪ IDLE';
      const playerList =
        lobby.player_count > 0 && !lobby.players.length
          ? '```Players joining...```'
          : lobby.players.length
            ? `\`\`\`${lobby.players.join(', ')}\`\`\``
            : '```Waiting for players```';

      embed.addFields({
        name: `🏁 ${lobby.name}`,
        value: [
          `**${status}** • ${lobby.player_count}/${lobby.max_players} Players`,
          playerList,
        ].join('\n'),
        inline: false,
      });
    }
  }

  // Enhanced footer
  embed.setFooter({
    text: 'Made with ❤️ by ZoniBoy00 | Last Updated',
    iconURL: 'https://i.imgur.com/a0EtQ5i.png',
  });

  return embed;
}
