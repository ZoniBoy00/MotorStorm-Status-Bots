# MotorStorm Status Bots - TypeScript Edition

Professional TypeScript Discord bots for monitoring MotorStorm server status with automatic lobby notifications.

## Supported Games

- **MotorStorm Arctic Edge** (AE)
- **MotorStorm Apocalypse** (Apoc)
- **MotorStorm Pacific Rift** (PR)
- **MotorStorm Monument Valley** (MV)

## Features

- TypeScript with full type safety and strict mode
- Multi-channel support - post to multiple Discord channels simultaneously
- Automatic lobby notifications with role mentions
- Smart cooldowns to prevent notification spam
- Unified launcher - start all bots with one command
- Independent operation - each bot uses its own token
- Graceful shutdown with proper cleanup
- Optimized performance with parallel channel updates
- Beautiful colorized console output

## Quick Start

### Installation

```bash
cd MotorStorm-Status-Bots
npm install
```

### Configuration

Create a `.env` file in the `MotorStorm-Status-Bots` directory:

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

### Important: Force Rebuild After Changes

If you update code or environment variables and changes don't take effect:

```bash
rm -rf dist
```

Then restart the server. The startup script only rebuilds if `dist/index.js` is missing.

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

1. **Enable debug mode** to see detailed logs:
   ```env
   DEBUG=true
   ```

2. **Check permissions:**
   - Bot needs "Send Messages" in notification channel
   - Bot needs permission to mention the role
   - Verify channel and role IDs are correct

3. **Verify setup:**
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
