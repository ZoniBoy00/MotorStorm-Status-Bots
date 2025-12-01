# MotorStorm Status Bots - TypeScript Edition

Professional TypeScript Discord bots for monitoring MotorStorm server status with automatic lobby notifications and comprehensive player analytics.

## Supported Games

- **MotorStorm Arctic Edge** (AE)
- **MotorStorm Apocalypse** (Apoc)
- **MotorStorm Pacific Rift** (PR)
- **MotorStorm Monument Valley** (MV)
- **MotorStorm Helper** - Analytics & Statistics Bot

## Features

- TypeScript with full type safety and strict mode
- Multi-channel support - post to multiple Discord channels simultaneously
- Automatic lobby notifications with role mentions
- Smart cooldowns to prevent notification spam
- Unified launcher - start all bots with one command
- Independent operation - each bot uses its own token
- Graceful shutdown with proper cleanup
- Optimized performance with parallel channel updates
- Modern Discord.js Events API (zero deprecation warnings)
- Beautiful colorized console output
- Real-time Data Collection - automatically tracks player activity every 5 minutes
- Visual Analytics - generate beautiful charts and graphs
- Player Statistics - track individual player activity across all games
- Peak Time Analysis - identify when servers are most active
- Game Distribution - see which MotorStorm titles are most popular
- Slash Commands - modern Discord command interface with embeds

## Quick Start

### Installation

```bash
cd TS_BOTS
npm install
```

### Configuration

Create a `.env` file:

```env
# Arctic Edge Bot
DISCORD_TOKEN_AE=your_token_here
CHANNEL_IDS_AE=channel_id_1,channel_id_2
NOTIFICATION_CHANNEL_AE=notification_channel_id
NOTIFICATION_ROLE_AE=role_id_to_mention

# Apocalypse Bot
DISCORD_TOKEN_APOC=your_token_here
CHANNEL_IDS_APOC=channel_id_1,channel_id_2
NOTIFICATION_CHANNEL_APOC=notification_channel_id
NOTIFICATION_ROLE_APOC=role_id_to_mention

# Pacific Rift Bot
DISCORD_TOKEN_PR=your_token_here
CHANNEL_IDS_PR=channel_id_1,channel_id_2
NOTIFICATION_CHANNEL_PR=notification_channel_id
NOTIFICATION_ROLE_PR=role_id_to_mention

# Monument Valley Bot
DISCORD_TOKEN_MV=your_token_here
CHANNEL_IDS_MV=channel_id_1,channel_id_2
NOTIFICATION_CHANNEL_MV=notification_channel_id
NOTIFICATION_ROLE_MV=role_id_to_mention

# Helper Bot (Analytics)
DISCORD_TOKEN_HELPER=your_helper_token_here

# Optional settings
DEBUG=false
PTERODACTYL_CONTAINER=false
```

### Run All Bots

```bash
npm start
```

This starts all bots that have valid tokens configured. Bots without tokens are automatically skipped.

### Run Individual Bots

```bash
npm run start:ae      # Arctic Edge only
npm run start:apoc    # Apocalypse only
npm run start:pr      # Pacific Rift only
npm run start:mv      # Monument Valley only
npm run start:helper  # Helper (Analytics) only
```

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

- Fun, engaging alert messages with randomized text
- Shows lobby name, player count, host, and game details
- Automatic role mentions for instant notifications
- 2-minute cooldown prevents spam
- Persistent tracking across bot restarts

### Disable Notifications

Simply omit the `NOTIFICATION_CHANNEL_*` and `NOTIFICATION_ROLE_*` variables for any bot you don't want to send notifications.

## MotorStorm Helper Bot

The Helper bot is a dedicated analytics bot that collects player activity data and provides insights through slash commands.

### Features

- **Real-time Data Collection**: Automatically tracks player activity every 5 minutes
- **Visual Analytics**: Generate beautiful charts and graphs
- **Player Statistics**: Track individual player activity across all games
- **Peak Time Analysis**: Identify when servers are most active
- **Game Distribution**: See which MotorStorm titles are most popular
- **Advanced Analytics**: Leaderboards, session tracking, retention metrics, and growth trends
- **Slash Commands**: Modern Discord command interface with embeds

### Slash Commands

| Command | Description | Options |
|---------|-------------|---------|
| `/help` | View all available commands and descriptions | None |
| `/dns` | View DNS addresses and server information | None |
| `/activity` | View player activity over time | `hours` - Time period (1-168 hours) |
| `/peaktimes` | View peak activity times by hour | None |
| `/weekdays` | View activity patterns by day of week | None |
| `/gamedist` | View game distribution across titles | None |
| `/playerstats` | View statistics for a specific player | `player` - In-game name (required) |
| `/topplayers` | View most active players | `limit` - Number of players (1-25) |
| `/leaderboard` | View specialized leaderboards | `type` - active/streak/diverse/social<br>`limit` - Number of players |
| `/lobbies` | View lobby statistics and popular hosts | None |
| `/sessions` | View session duration analytics | None |
| `/retention` | View player retention statistics | None |
| `/growth` | View player growth trends | `days` - Time period (7-90 days) |
| `/predict` | View predicted peak times | None |
| `/current` | View current online players | None |

### Setup

1. **Create a Discord bot** for the Helper at the [Discord Developer Portal](https://discord.com/developers/applications)
2. **Enable required intents**: Guilds, Guild Messages
3. **Invite the bot** to your server with appropriate permissions
4. **Set environment variable**:
   ```env
   DISCORD_TOKEN_HELPER=your_helper_bot_token_here
   ```
5. **Run the bot**:
   ```bash
   npm run start:helper
   ```

The bot will automatically register slash commands when it starts.

### Data Collection & Storage

The Helper bot automatically collects and stores player activity data every 5 minutes.

#### What Data is Collected

- **Player Activity**: When players are online, which games they play
- **Lobby Analytics**: Lobby names, durations, player counts, host tracking
- **Session Data**: Individual session lengths, start/end times
- **Social Connections**: Which players play together frequently
- **Historical Trends**: Up to 34 days of 5-minute interval snapshots (10,000 snapshots max)

#### Data Storage Locations

- **Windows/Local Development**: `./data/` in the project directory
- **Linux/macOS/Pterodactyl**: `/tmp/motorstorm-data/` (when `PTERODACTYL_CONTAINER=true`)

#### Data Files

The bot creates and maintains the following JSON files:

- `activity.json` - General activity log
- `player-stats.json` - Individual player statistics
- `snapshots.json` - Historical activity snapshots (5-min intervals)
- `lobby-analytics.json` - Lobby tracking and statistics
- `sessions.json` - Player session records
- `game-modes.json` - Game mode popularity (Arctic Edge only)
- `social.json` - Social connection data

#### API Limitations

**Important:** The MotorStorm server APIs do not provide race results or competitive data. Available data includes:

✅ **Available:**
- Player names in lobbies
- Lobby configurations (tracks, game modes, lap counts for Arctic Edge)
- Player counts and online status
- Session information (online/offline timing)

❌ **Not Available:**
- Race outcomes or win/loss records
- Lap times or positions
- Individual race performance
- Competitive rankings from races

Due to these API limitations, the Helper bot cannot track race wins, lap records, or competitive statistics.

### Charts & Visualizations

The Helper bot generates real-time charts using QuickChart.io API:
- **Activity Chart**: Multi-line graph showing player count over time for all games
- **Peak Times Chart**: Color-coded bar chart showing busiest hours (24-hour format)
- **Game Distribution**: Pie chart showing player distribution across games
- **Weekday Patterns**: Bar chart showing activity by day of week
- **Growth Trends**: Line graph showing player base growth over time
- **Retention Charts**: Visualization of player return rates
- **Session Analytics**: Distribution charts for session durations

All charts use a modern dark theme optimized for Discord's interface with clear labels and high contrast colors.

### Important: Force Rebuild After Changes

If you update code or environment variables and changes don't take effect:

```bash
rm -rf dist
```

Then restart the server. The startup script only rebuilds if `dist/index.js` is missing.

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

The Docker image includes proper signal handling via `dumb-init` for graceful shutdowns.

## Project Structure

```
TS_BOTS/
├── src/
│   ├── bots/           # Individual bot implementations
│   ├── core/           # Shared base classes and API client
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utilities (logger, notifications, etc.)
│   └── index.ts        # Unified launcher
├── data/               # Runtime data (auto-created)
├── dist/               # Compiled JavaScript (after build)
├── .env                # Your configuration
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Configuration Reference

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN_*` | Discord bot token for each game | Yes (per bot) |
| `CHANNEL_IDS_*` | Comma-separated channel IDs for status updates | Yes (per bot) |
| `NOTIFICATION_CHANNEL_*` | Channel ID for lobby notifications | Optional |
| `NOTIFICATION_ROLE_*` | Role ID to mention in notifications | Optional |
| `DEBUG` | Enable detailed logging | No (default: false) |
| `PTERODACTYL_CONTAINER` | Enable Pterodactyl compatibility mode | No (default: false) |

### Intervals

All intervals can be customized in each bot's config file:

- **Status Check:** 10 seconds (how often to check for updates)
- **Activity Rotation:** 30 seconds (how often to change bot status)
- **Notification Cooldown:** 120 seconds (minimum time between notifications for same lobby)

## Performance Metrics

- **Memory Usage:** 50-100MB per bot
- **CPU Usage:** <5% average
- **Network:** Minimal (API calls every 10 seconds)
- **Startup Time:** 2-5 seconds per bot
- **Channel Updates:** <1 second (parallel processing)

## Development

### Build TypeScript

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Clean Build

```bash
npm run clean
npm run build
```

### Development with Hot Reload

```bash
npm run start:dev
```

## Troubleshooting

### Bot Won't Start

- Verify `DISCORD_TOKEN_*` is set correctly
- Check that channel IDs are valid 18-digit Discord IDs
- Ensure bot is in your Discord server
- Verify bot has required permissions

### Notifications Not Working

1. **Force rebuild**:
   ```bash
   rm -rf dist
   ```
   Then restart the bot.

2. **Enable debug mode** to see detailed logs:
   ```env
   DEBUG=true
   ```

3. **Check permissions:**
   - Bot needs "Send Messages" in notification channel
   - Bot needs permission to mention the role
   - Verify channel and role IDs are correct

4. **Verify setup:**
   - Both `NOTIFICATION_CHANNEL_*` and `NOTIFICATION_ROLE_*` must be set
   - Bot must be in the same server as the notification channel
   - Role must be mentionable by the bot

### TypeScript Compilation Errors

```bash
rm -rf node_modules dist
npm install
npm run build
```

## Credits

Developed by ZoniBoy00

Special thanks to the MotorStorm community and server operators.

## License

MIT License
