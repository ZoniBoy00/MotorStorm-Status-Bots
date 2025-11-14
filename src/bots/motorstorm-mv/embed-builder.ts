import { EmbedBuilder } from 'discord.js';
import { ServerData } from '../../types';

/**
 * Build Discord embed for MotorStorm Monument Valley status
 */
export function buildMVEmbed(data: ServerData): EmbedBuilder {
  const mvData = data.motorstorm_mv;

  const embed = new EmbedBuilder()
    .setTitle('MotorStorm: Monument Valley')
    .setDescription(
      `> Real-time server status and player activity\n> [View Server Dashboard](https://psrewired.com/servers/20764)`
    )
    .setColor('#fccd14')
    .setTimestamp(new Date())
    .setThumbnail('https://i.imgur.com/haIBKrD.png');

  // Add summary with better visual separation
  const summaryEmoji = mvData.summary.total_players > 0 ? '🟢' : '⚪';
  embed.addFields({
    name: `${summaryEmoji} Server Overview`,
    value: [
      `┌ **Active Lobbies:** ${mvData.summary.active_lobbies}`,
      `└ **Players Online:** ${mvData.summary.total_players}`,
    ].join('\n'),
    inline: false,
  });

  // Add general lobby status with improved formatting
  const generalPlayers = mvData.general_lobby.players;
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
  if (mvData.lobbies.some((l) => l.is_active)) {
    embed.addFields({
      name: '━━━━━━━━━━━━━━━━━━━━━━',
      value: '**Active Game Lobbies**',
      inline: false,
    });

    for (const lobby of mvData.lobbies) {
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
    iconURL: 'https://i.imgur.com/haIBKrD.png',
  });

  return embed;
}
