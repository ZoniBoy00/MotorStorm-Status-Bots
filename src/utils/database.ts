import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Logger } from './logger';

dotenv.config();

export class Database {
    private static pool: mysql.Pool | undefined;
    private static logger = new Logger('Database');

    private static getConfig() {
        const required = ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'] as const;
        const missing = required.filter((key) => !process.env[key]?.trim());
        if (missing.length > 0) {
            throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
        }

        const port = Number(process.env.MYSQL_PORT);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('MYSQL_PORT must be a valid TCP port');
        }

        return {
            host: process.env.MYSQL_HOST!,
            port,
            user: process.env.MYSQL_USER!,
            password: process.env.MYSQL_PASSWORD!,
            database: process.env.MYSQL_DATABASE!,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 10_000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        };
    }

    public static async init(): Promise<void> {
        if (this.pool) return;

        try {
            this.pool = mysql.createPool(this.getConfig());
            const connection = await this.pool.getConnection();
            try {
                await this.createTables(connection);
            } finally {
                connection.release();
            }
            this.logger.success('MySQL connection established and tables verified');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to initialize MySQL: ${message}`);
            if (this.pool) {
                await this.pool.end().catch(() => undefined);
                this.pool = undefined;
            }
            throw error;
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
        const pool = this.pool;
        if (!pool) throw new Error('MySQL pool is not initialized');
        const [results] = await pool.execute(sql, params);
        return results as T;
    }

    public static async getPool(): Promise<mysql.Pool> {
        if (!this.pool) await this.init();
        if (!this.pool) throw new Error('MySQL pool is not initialized');
        return this.pool;
    }
}
