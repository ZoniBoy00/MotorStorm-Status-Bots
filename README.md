# MotorStorm Status Bots

Professional TypeScript Discord bots for monitoring MotorStorm server status with automatic lobby notifications.

## Supported Games

- **MotorStorm Arctic Edge** (AE)
- **MotorStorm Apocalypse** (Apoc)
- **MotorStorm Pacific Rift** (PR)
- **MotorStorm Monument Valley** (MV)
- **Helper Bot** (Analytics & Commands)

## Features

- TypeScript with full type safety and strict mode
- Multi-channel support - post to multiple Discord channels simultaneously
- Automatic lobby notifications with role mentions
- Smart cooldowns to prevent notification spam
- Unified launcher - start all bots with one command
- Independent operation - each bot uses its own token
- Graceful shutdown with proper cleanup
- Optimized performance with parallel channel updates
- Modern Discord.js v14 Events API (zero deprecation warnings)
- Beautiful colorized console output
- Pterodactyl Panel compatible with Docker support
- **Slash commands** for analytics (activity, player stats, leaderboards)
- **Input sanitization** for security
- **Command cooldowns** to prevent spam
- **Database support** for historical analytics

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
# Bot Tokens (Required)
DISCORD_TOKEN_AE=your_token_here
DISCORD_TOKEN_APOC=your_token_here
DISCORD_TOKEN_PR=your_token_here
DISCORD_TOKEN_MV=your_token_here
DISCORD_TOKEN_HELPER=your_token_here

# Channel IDs (Required - comma-separated)
CHANNEL_IDS_AE=channel_id_1,channel_id_2
CHANNEL_IDS_APOC=channel_id_1
CHANNEL_IDS_PR=channel_id_1
CHANNEL_IDS_MV=channel_id_1

# Notifications (Optional)
NOTIFICATION_CHANNEL_AE=channel_id
NOTIFICATION_ROLE_AE=role_id
NOTIFICATION_PINGS_AE=false

# Database (Required for analytics)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=motorstorm_stats
```

### Run All Bots

```bash
npm start
```

This starts all bots that have valid tokens configured. Bots without tokens are automatically skipped.

### Deploy Slash Commands

```bash
# Global commands (takes up to 1 hour to propagate)
npm run deploy

# Or for faster development testing (guild-specific)
DISCORD_GUILD_ID=your_guild_id npm run deploy
```

## Helper Bot Commands

The Helper bot provides comprehensive analytics via Discord slash commands:

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/dns` | View DNS addresses for all games |
| `/activity [hours]` | Player activity graph |
| `/peaktimes` | Peak activity hours |
| `/weekdays` | Activity by day of week |
| `/gamedist` | Game popularity distribution |
| `/playerstats <name>` | Detailed player statistics |
| `/topplayers [limit]` | Most active players |
| `/leaderboard <type>` | Specialized leaderboards |
| `/current` | Currently online players |
| `/random [game]` | Random track picker |

## Lobby Notifications

### Setup

1. **Create a notification channel** in Discord (e.g., `#lobby-alerts`)
2. **Create a role** to mention (e.g., `@MotorStorm Players`)
3. **Get the IDs** by right-clicking and selecting "Copy ID" (enable Developer Mode if needed)
4. **Add to `.env` file:**

```env
NOTIFICATION_CHANNEL_AE=1234567890123456789
NOTIFICATION_ROLE_AE=9876543210987654321
```

5. **Grant permissions:**
   - Bot needs "Send Messages" in the notification channel
   - Bot needs permission to mention the role
   - Bot needs "View Channel" for the notification channel

### Features

- Shows lobby name, player count, and game details
- Automatic role mentions for instant notifications
- 2-minute cooldown prevents spam
- Persistent tracking across bot restarts

### Disable Notifications

Simply omit the `NOTIFICATION_CHANNEL_*` and `NOTIFICATION_ROLE_*` variables.

## Pterodactyl Panel Deployment

### Quick Setup

1. **Upload the pterodactyl-egg.json** to your Pterodactyl Panel
2. **Create a new server** using the egg
3. **Set environment variables** in the Startup tab
4. **Start the server**

### Required Variables

- At least one `DISCORD_TOKEN_*`
- Corresponding `CHANNEL_IDS_*` for each enabled bot
- MySQL database for analytics features

## Docker Deployment

### Build Image

```bash
docker build -t motorstorm-bots .
```

### Run Container

```bash
docker run -d \
  --name motorstorm-bots \
  --env-file .env \
  motorstorm-bots
```

The Docker image includes:
- Multi-stage build for optimized size
- Non-root user for security
- Proper signal handling via `dumb-init`

## Configuration Reference

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN_*` | Discord bot token for each game | Yes (per bot) |
| `CHANNEL_IDS_*` | Comma-separated channel IDs | Yes (per bot) |
| `NOTIFICATION_CHANNEL_*` | Channel for lobby notifications | Optional |
| `NOTIFICATION_ROLE_*` | Role to mention in notifications | Optional |
| `NOTIFICATION_PINGS_*` | Enable @mentions (true/false) | Optional |
| `MYSQL_*` | Database configuration | Required for analytics |
| `DISCORD_CLIENT_ID` | For command deployment | Optional |
| `DISCORD_GUILD_ID` | For development commands | Optional |
| `DEBUG` | Enable detailed logging | No (default: false) |

## Project Structure

```
MsStatusBots/
├── src/
│   ├── bots/              # Individual bot implementations
│   │   ├── motorstorm-ae/
│   │   ├── motorstorm-apoc/
│   │   ├── motorstorm-pr/
│   │   ├── motorstorm-mv/
│   │   └── motorstorm-helper/  # Analytics & commands
│   ├── core/              # Shared base classes and API client
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Logger, database, notifications
│   ├── scripts/           # Deploy and migration scripts
│   └── index.ts           # Unified launcher
├── data/                  # Runtime data (auto-created)
├── dist/                  # Compiled JavaScript
├── .env.example           # Environment template
├── Dockerfile             # Docker configuration
└── pterodactyl-egg.json   # Pterodactyl Panel egg
```

## Performance Metrics

- **Memory Usage:** ~140MB total for all bots
- **CPU Usage:** <3% average
- **Network:** Minimal (API calls every 10 seconds)
- **Startup Time:** 3-5 seconds for all bots
- **Channel Updates:** <1 second (parallel processing)

## Development

### Commands

```bash
npm run build          # Compile TypeScript
npm start              # Build and run all bots
npm run start:dev      # Run with ts-node (dev mode)
npm run deploy        # Register slash commands
npm run migrate       # Migrate JSON data to MySQL
npm run clean         # Remove dist folder
```

### Debug Mode

```env
DEBUG=true
```

## Credits

Developed by ZoniBoy00

Special thanks to the MotorStorm community and server operators.

## License

MIT License