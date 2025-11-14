import { EmbedBuilder } from 'discord.js';
import { ServerData } from '../../types';

/**
 * Build Discord embed for MotorStorm Arctic Edge status
 */
export function buildAEEmbed(data: ServerData): EmbedBuilder {
  const aeData = data.motorstorm_ae;

  const embed = new EmbedBuilder()
    .setTitle('MotorStorm: Arctic Edge')
    .setDescription(
      `> Real-time server status and player activity\n> [View Server Dashboard](https://agracingfoundation.org/listing)`
    )
    .setColor('#7db3d5')
    .setTimestamp(new Date())
    .setThumbnail('https://i.imgur.com/165bVYY.png');

  // Add summary with better visual separation
  const summaryEmoji = aeData.summary.total_players > 0 ? '🟢' : '⚪';
  embed.addFields({
    name: `${summaryEmoji} Server Overview`,
    value: [
      `┌ **Active Lobbies:** ${aeData.summary.active_lobbies}`,
      `└ **Players Online:** ${aeData.summary.total_players}`,
    ].join('\n'),
    inline: false,
  });

  // Add general lobby status with improved formatting
  const generalPlayers = aeData.general_lobby.players;
  const generalStatus = generalPlayers.length
    ? `\`\`\`${generalPlayers.join(', ')}\`\`\``
    : '```No players currently online```';

  embed.addFields({
    name: '🌐 Main Lobby',
    value: [
      `**Players:** ${aeData.general_lobby.player_count}`,
      generalStatus,
    ].join('\n'),
    inline: false,
  });

  // Add active lobbies with enhanced visual design
  if (aeData.lobbies.some((l) => l.is_active)) {
    embed.addFields({
      name: '━━━━━━━━━━━━━━━━━━━━━━',
      value: '**Active Game Lobbies**',
      inline: false,
    });

    for (const lobby of aeData.lobbies) {
      if (!lobby.is_active) continue;

      const status = lobby.player_count > 0 ? '🟢 ACTIVE' : '⚪ IDLE';
      const playerList =
        lobby.player_count > 0 && !lobby.players.length
          ? '```Players joining...```'
          : lobby.players.length
            ? `\`\`\`${lobby.players.join(', ')}\`\`\``
            : '```Waiting for players```';

      let valueLines = [
        `**${status}** • ${lobby.player_count}/${lobby.max_players} Players`,
        playerList,
      ];

      // Add game configuration if available
      if (lobby.config) {
        const configDetails: string[] = [];
        if (lobby.config.track) configDetails.push(`Track: ${lobby.config.track}`);
        if (lobby.config.gameMode) configDetails.push(`Mode: ${lobby.config.gameMode}`);
        if (lobby.config.lapCount) configDetails.push(`Laps: ${lobby.config.lapCount}`);
        if (lobby.config.direction)
          configDetails.push(`Direction: ${lobby.config.direction}`);

        if (configDetails.length > 0) {
          valueLines.push(`\`${configDetails.join(' • ')}\``);
        }
      }

      embed.addFields({
        name: `🏁 ${lobby.name}`,
        value: valueLines.join('\n'),
        inline: false,
      });
    }
  }

  // Enhanced footer
  embed.setFooter({
    text: 'Made with ❤️ by ZoniBoy00 | Last Updated',
    iconURL: 'https://i.imgur.com/165bVYY.png',
  });

  return embed;
}
