import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Logger } from './logger';

dotenv.config();

export class Database {
    private static pool: mysql.Pool;
    private static logger = new Logger('Database');

    public static async init() {
        if (!this.pool) {
            try {
                this.pool = mysql.createPool({
                    host: process.env.MYSQL_HOST || 'localhost',
                    port: parseInt(process.env.MYSQL_PORT || '3306'),
                    user: process.env.MYSQL_USER || 'root',
                    password: process.env.MYSQL_PASSWORD || '',
                    database: process.env.MYSQL_DATABASE || 'motorstorm_stats',
                    waitForConnections: true,
                    connectionLimit: 10,
                    queueLimit: 0,
                });

                // Test connection
                const connection = await this.pool.getConnection();
                this.logger.success('MySQL connection established');

                await this.createTables(connection);

                connection.release();
            } catch (error) {
                this.logger.error('Failed to connect to MySQL:', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    }

    private static async createTables(connection: mysql.PoolConnection) {
        try {
            await connection.query(`
        CREATE TABLE IF NOT EXISTS snapshots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp BIGINT NOT NULL,
          ae_players JSON,
          ae_lobbies INT DEFAULT 0,
          apoc_players JSON,
          apoc_lobbies INT DEFAULT 0,
          pr_players JSON,
          pr_lobbies INT DEFAULT 0,
          mv_players JSON,
          mv_lobbies INT DEFAULT 0,
          total_players INT DEFAULT 0,
          INDEX (timestamp)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS player_stats (
          player_name VARCHAR(255) PRIMARY KEY,
          total_sessions INT DEFAULT 0,
          total_minutes INT DEFAULT 0,
          last_seen BIGINT,
          first_seen BIGINT,
          ae_sessions INT DEFAULT 0,
          apoc_sessions INT DEFAULT 0,
          pr_sessions INT DEFAULT 0,
          mv_sessions INT DEFAULT 0,
          peak_hours JSON,
          peak_days JSON,
          playtime_ae INT DEFAULT 0,
          playtime_apoc INT DEFAULT 0,
          playtime_pr INT DEFAULT 0,
          playtime_mv INT DEFAULT 0,
          average_session_length FLOAT DEFAULT 0,
          longest_session INT DEFAULT 0
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          player_name VARCHAR(255),
          game VARCHAR(10),
          session_start BIGINT,
          session_end BIGINT,
          duration INT,
          INDEX (player_name),
          INDEX (session_start)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS lobby_analytics (
          lobby_key VARCHAR(255) PRIMARY KEY,
          lobby_name VARCHAR(255),
          game VARCHAR(10),
          appearances INT DEFAULT 0,
          average_duration FLOAT DEFAULT 0,
          average_players FLOAT DEFAULT 0,
          first_seen BIGINT,
          last_seen BIGINT
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS social_connections (
          player_name VARCHAR(255),
          co_player_name VARCHAR(255),
          count INT DEFAULT 0,
          PRIMARY KEY (player_name, co_player_name)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS game_modes (
          mode VARCHAR(50) PRIMARY KEY,
          count INT DEFAULT 0,
          popular_tracks JSON,
          average_laps FLOAT DEFAULT 0,
          direction_forward INT DEFAULT 0,
          direction_reverse INT DEFAULT 0
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS bot_messages (
          bot_name VARCHAR(50),
          channel_id VARCHAR(50),
          message_id VARCHAR(50),
          PRIMARY KEY (bot_name, channel_id)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS bot_notifications_history (
          bot_name VARCHAR(50),
          lobby_name VARCHAR(255),
          players JSON,
          timestamp BIGINT,
          PRIMARY KEY (bot_name, lobby_name)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS track_popularity (
          track_name VARCHAR(255) PRIMARY KEY,
          count INT DEFAULT 0,
          game VARCHAR(10)
        )
      `);

            await connection.query(`
        CREATE TABLE IF NOT EXISTS player_registry (
          player_name VARCHAR(255) PRIMARY KEY,
          first_seen BIGINT,
          last_seen BIGINT,
          games_played JSON
        )
      `);

            this.logger.info('Database tables verified/created');
        } catch (error) {
            this.logger.error('Failed to create tables:', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    public static async query<T = any>(sql: string, params?: any[]): Promise<T> {
        if (!this.pool) await this.init();
        const [results] = await this.pool.execute(sql, params);
        return results as T;
    }

    public static async getPool() {
        if (!this.pool) await this.init();
        return this.pool;
    }
}
