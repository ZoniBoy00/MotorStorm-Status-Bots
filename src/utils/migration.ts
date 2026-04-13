import * as fs from 'fs';
import * as path from 'path';
import { Database } from './database';
import { Logger } from './logger';
import {
    ActivitySnapshot,
    PlayerStatistics,
    LobbyAnalytics,
    SessionRecord,
    GameModeStats,
    SocialStats
} from '../types';

const logger = new Logger('Migration');

export async function runMigration() {
    const dataPath = path.join(process.cwd(), 'data');
    const lockFile = path.join(dataPath, '.migrated');

    if (fs.existsSync(lockFile)) {
        return;
    }

    if (!fs.existsSync(dataPath)) {
        logger.info('No data directory found, skipping migration');
        return;
    }

    logger.info('Starting one-time migration from JSON to MySQL...');

    try {
        await Database.init();
        const pool = await Database.getPool();

        // 1. Migrate Snapshots
        const snapshotsPath = path.join(dataPath, 'snapshots.json');
        if (fs.existsSync(snapshotsPath)) {
            logger.info('Migrating snapshots...');
            const snapshots: ActivitySnapshot[] = JSON.parse(fs.readFileSync(snapshotsPath, 'utf-8'));
            for (const s of snapshots) {
                await pool.execute(
                    'INSERT IGNORE INTO snapshots (timestamp, ae_players, ae_lobbies, apoc_players, apoc_lobbies, pr_players, pr_lobbies, mv_players, mv_lobbies, total_players) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        s.timestamp,
                        JSON.stringify(s.ae.players),
                        s.ae.lobbies,
                        JSON.stringify(s.apoc.players),
                        s.apoc.lobbies,
                        JSON.stringify(s.pr.players),
                        s.pr.lobbies,
                        JSON.stringify(s.mv.players),
                        s.mv.lobbies,
                        s.totalPlayers
                    ]
                );
            }
            logger.success(`Migrated ${snapshots.length} snapshots`);
        }

        // 2. Migrate Player Stats
        const statsPath = path.join(dataPath, 'player-stats.json');
        if (fs.existsSync(statsPath)) {
            logger.info('Migrating player stats...');
            const statsObj: Record<string, PlayerStatistics> = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
            for (const [name, s] of Object.entries(statsObj)) {
                await pool.execute(
                    'INSERT IGNORE INTO player_stats (player_name, total_sessions, total_minutes, last_seen, first_seen, ae_sessions, apoc_sessions, pr_sessions, mv_sessions, peak_hours, peak_days, playtime_ae, playtime_apoc, playtime_pr, playtime_mv, average_session_length, longest_session) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        name,
                        s.totalSessions || 0,
                        s.totalMinutes || 0,
                        s.lastSeen,
                        s.firstSeen,
                        s.games?.ae || 0,
                        s.games?.apoc || 0,
                        s.games?.pr || 0,
                        s.games?.mv || 0,
                        JSON.stringify(s.peakHours || {}),
                        JSON.stringify(s.peakDays || {}),
                        s.playtimeByGame?.ae || 0,
                        s.playtimeByGame?.apoc || 0,
                        s.playtimeByGame?.pr || 0,
                        s.playtimeByGame?.mv || 0,
                        s.averageSessionLength || 0,
                        s.longestSession || 0
                    ]
                );
            }
            logger.success(`Migrated stats for ${Object.keys(statsObj).length} players`);
        }

        // 3. Migrate Sessions
        const sessionsPath = path.join(dataPath, 'sessions.json');
        if (fs.existsSync(sessionsPath)) {
            logger.info('Migrating sessions...');
            const sessions: SessionRecord[] = JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
            for (const s of sessions) {
                await pool.execute(
                    'INSERT IGNORE INTO sessions (player_name, game, session_start, session_end, duration) VALUES (?, ?, ?, ?, ?)',
                    [s.playerName, s.game, s.sessionStart, s.sessionEnd, s.duration]
                );
            }
            logger.success(`Migrated ${sessions.length} sessions`);
        }

        // 4. Migrate Lobby Analytics
        const lobbyPath = path.join(dataPath, 'lobby-analytics.json');
        if (fs.existsSync(lobbyPath)) {
            logger.info('Migrating lobby analytics...');
            const lobbyObj: Record<string, LobbyAnalytics> = JSON.parse(fs.readFileSync(lobbyPath, 'utf-8'));
            for (const [key, l] of Object.entries(lobbyObj)) {
                await pool.execute(
                    'INSERT IGNORE INTO lobby_analytics (lobby_key, lobby_name, game, appearances, average_duration, average_players, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        key,
                        l.lobbyName,
                        l.game,
                        l.appearances,
                        l.averageDuration,
                        l.averagePlayers,
                        l.firstSeen,
                        l.lastSeen
                    ]
                );
            }
            logger.success(`Migrated ${Object.keys(lobbyObj).length} lobbies`);
        }

        // 5. Migrate Social Connections
        const socialPath = path.join(dataPath, 'social.json');
        if (fs.existsSync(socialPath)) {
            logger.info('Migrating social connections...');
            const socialObj: Record<string, SocialStats> = JSON.parse(fs.readFileSync(socialPath, 'utf-8'));
            for (const [name, s] of Object.entries(socialObj)) {
                if (s.coPlayers) {
                    const coPlayers = s.coPlayers instanceof Map ? Object.fromEntries(s.coPlayers) : s.coPlayers;
                    for (const [coName, count] of Object.entries(coPlayers)) {
                        await pool.execute(
                            'INSERT IGNORE INTO social_connections (player_name, co_player_name, count) VALUES (?, ?, ?)',
                            [name, coName, count]
                        );
                    }
                }
            }
            logger.success('Migrated social connections');
        }

        // 6. Migrate Game Modes
        const gameModePath = path.join(dataPath, 'game-modes.json');
        if (fs.existsSync(gameModePath)) {
            logger.info('Migrating game modes...');
            const modeObj: Record<string, GameModeStats> = JSON.parse(fs.readFileSync(gameModePath, 'utf-8'));
            for (const [mode, s] of Object.entries(modeObj)) {
                await pool.execute(
                    'INSERT IGNORE INTO game_modes (mode, count, popular_tracks, average_laps, direction_forward, direction_reverse) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        mode,
                        s.count,
                        JSON.stringify(s.popularTracks || {}),
                        s.averageLaps || 0,
                        s.direction?.forward || 0,
                        s.direction?.reverse || 0
                    ]
                );
            }
            logger.success(`Migrated ${Object.keys(modeObj).length} game modes`);
        }

        // 7. Migrate Message IDs
        const files = fs.readdirSync(dataPath);
        const messageIdFiles = files.filter((f: string) => f.endsWith('_message_ids.json'));
        for (const file of messageIdFiles) {
            try {
                const botNameRaw = file.replace('_message_ids.json', '');
                // Map filename to actual bot name in DB (case sensitive)
                const botName = botNameRaw.includes('ae') ? 'MotorStorm-AE' :
                    botNameRaw.includes('apoc') ? 'MotorStorm-Apoc' :
                        botNameRaw.includes('pr') ? 'MotorStorm-PR' :
                            botNameRaw.includes('mv') ? 'MotorStorm-MV' : botNameRaw;

                logger.info(`Migrating message IDs for ${botName}...`);
                const content = fs.readFileSync(path.join(dataPath, file), 'utf-8');
                if (content.trim()) {
                    const messageIds: Record<string, string> = JSON.parse(content);
                    for (const [channelId, messageId] of Object.entries(messageIds)) {
                        await pool.execute(
                            'INSERT INTO bot_messages (bot_name, channel_id, message_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE message_id = ?',
                            [botName, channelId, messageId, messageId]
                        );
                    }
                    logger.success(`Migrated message IDs for ${botName}`);
                }
            } catch (err) {
                logger.error(`Failed to migrate message IDs for ${file}:`, err instanceof Error ? err : new Error(String(err)));
            }
        }

        // 8. Migrate Lobby History
        const lobbyHistoryFiles = files.filter((f: string) => f.endsWith('-lobbies.json'));
        for (const file of lobbyHistoryFiles) {
            try {
                const botNameMatch = file.match(/^(.+)-lobbies\.json$/);
                if (!botNameMatch) continue;

                const botNameRaw = botNameMatch[1];
                // Map filename to actual bot name in DB (case sensitive)
                const botName = botNameRaw.includes('ae') ? 'MotorStorm-AE' :
                    botNameRaw.includes('apoc') ? 'MotorStorm-Apoc' :
                        botNameRaw.includes('pr') ? 'MotorStorm-PR' :
                            botNameRaw.includes('mv') ? 'MotorStorm-MV' : botNameRaw;

                logger.info(`Migrating lobby history for ${botName}...`);
                const content = fs.readFileSync(path.join(dataPath, file), 'utf-8');
                if (content.trim()) {
                    const lobbyHistory: Record<string, any> = JSON.parse(content);
                    for (const [lobbyName, data] of Object.entries(lobbyHistory)) {
                        await pool.execute(
                            'INSERT INTO bot_notifications_history (bot_name, lobby_name, players, timestamp) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE players = ?, timestamp = ?',
                            [botName, lobbyName, JSON.stringify(data.players || []), data.timestamp, JSON.stringify(data.players || []), data.timestamp]
                        );
                    }
                    logger.success(`Migrated lobby history for ${botName}`);
                }
            } catch (err) {
                logger.error(`Failed to migrate lobby history for ${file}:`, err instanceof Error ? err : new Error(String(err)));
            }
        }

        fs.writeFileSync(lockFile, new Date().toISOString());
        logger.success('Migration complete!');
    } catch (error) {
        logger.error('Migration failed:', error instanceof Error ? error : new Error(String(error)));
        // Don't throw, let the bot try to start anyway
    }
}
