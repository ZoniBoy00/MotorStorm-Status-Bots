import { EmbedBuilder } from 'discord.js';
import { ServerData } from '../../types';

/**
 * Build Discord embed for MotorStorm Pacific Rift status
 */
export function buildPREmbed(data: ServerData): EmbedBuilder {
  const prData = data.motorstorm_pr;

  const embed = new EmbedBuilder()
    .setTitle('MotorStorm: Pacific Rift')
    .setDescription(
      `> Real-time server status and player activity\n> [View Server Dashboard](https://psrewired.com/servers/21624)`
    )
    .setColor('#050505')
    .setTimestamp(new Date())
    .setThumbnail('https://i.imgur.com/swjSj1B.png');

  // Add summary with better visual separation
  const summaryEmoji = prData.summary.total_players > 0 ? '🟢' : '⚪';
  embed.addFields({
    name: `${summaryEmoji} Server Overview`,
    value: [
      `┌ **Active Lobbies:** ${prData.summary.active_lobbies}`,
      `└ **Players Online:** ${prData.summary.total_players}`,
    ].join('\n'),
    inline: false,
  });

  // Add general lobby status with improved formatting
  const generalPlayers = prData.general_lobby.players;
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

  // Add active lobbies with enhanced visual design (filter out "PR East")
  const activeLobbies = prData.lobbies.filter(
    (l) => l.is_active && !l.name.includes('PR East')
  );

  if (activeLobbies.length > 0) {
    embed.addFields({
      name: '━━━━━━━━━━━━━━━━━━━━━━',
      value: '**Active Game Lobbies**',
      inline: false,
    });

    for (const lobby of activeLobbies) {
      const status = lobby.player_count > 0 ? '🟢 ACTIVE' : '⚪ IDLE';

      let playerList: string;
      if (lobby.player_count > 0 && !lobby.players.length) {
        playerList = '```Players joining...```';
      } else if (lobby.players.length > 0) {
        const displayPlayers = lobby.players.join(', ');
        const additionalCount =
          lobby.player_count > lobby.players.length
            ? ` +${lobby.player_count - lobby.players.length} more`
            : '';
        playerList = `\`\`\`${displayPlayers}${additionalCount}\`\`\``;
      } else {
        playerList = '```Waiting for players```';
      }

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
    iconURL: 'https://i.imgur.com/swjSj1B.png',
  });

  return embed;
}
