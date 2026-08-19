# Pterodactyl Panel Setup Guide

This guide explains how to deploy the MotorStorm Status Bots on a Pterodactyl Panel server.

## Quick Start

### Method 1: Using the Egg File (Recommended)

1. **Import the Egg**
   - Download `pterodactyl-egg.json` from this repository
   - In your Pterodactyl admin panel, go to **Nests** → **Import Egg**
   - Upload the JSON file

2. **Create a New Server**
   - Go to **Servers** → **Create New**
   - Select the "MotorStorm Status Bots" egg
   - Allocate at least **512MB RAM** (recommended: 1GB)
   - The startup command is pre-configured: `node dist/index.js`

3. **Configure Environment Variables**
   
   **Required** (at least one bot):
   - `DISCORD_TOKEN_AE` - Arctic Edge bot token
   - `DISCORD_TOKEN_APOC` - Apocalypse bot token
   - `DISCORD_TOKEN_PR` - Pacific Rift bot token
   - `DISCORD_TOKEN_MV` - Monument Valley bot token
   - `DISCORD_TOKEN_HELPER` - Analytics/Commands bot token
   
   **Required** (for each enabled bot):
   - `CHANNEL_IDS_AE` - Channel IDs (comma-separated)
   - `CHANNEL_IDS_APOC` - Channel IDs
   - `CHANNEL_IDS_PR` - Channel IDs
   - `CHANNEL_IDS_MV` - Channel IDs
   
   **Optional**:
   - `NOTIFICATION_CHANNEL_*` - Lobby notification channel
   - `NOTIFICATION_ROLE_*` - Role to mention
   - `NOTIFICATION_PINGS_*` - Enable/disable pings
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

4. **Start the Server**
   - Click **Start** in your server console
   - The installation script will automatically:
     - Clone repo (if GIT_REPO is set)
     - Install dependencies
     - Build TypeScript
     - Start the bots

## Environment Variables Reference

### Bot Tokens (Required)

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN_AE` | MotorStorm Arctic Edge bot token |
| `DISCORD_TOKEN_APOC` | MotorStorm Apocalypse bot token |
| `DISCORD_TOKEN_PR` | MotorStorm Pacific Rift bot token |
| `DISCORD_TOKEN_MV` | MotorStorm Monument Valley bot token |
| `DISCORD_TOKEN_HELPER` | Helper/Analytics bot token |

### Channel IDs (Required for each bot)

| Variable | Description |
|----------|-------------|
| `CHANNEL_IDS_AE` | Comma-separated channel IDs |
| `CHANNEL_IDS_APOC` | Comma-separated channel IDs |
| `CHANNEL_IDS_PR` | Comma-separated channel IDs |
| `CHANNEL_IDS_MV` | Comma-separated channel IDs |

### Notification Settings (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `NOTIFICATION_CHANNEL_AE` | Notification channel ID | - |
| `NOTIFICATION_ROLE_AE` | Role ID to mention | - |
| `NOTIFICATION_PINGS_AE` | Enable @mentions | true |
| *(same for APOC, PR, MV)* | | |

### Database (Required - the launcher validates these settings)

| Variable | Description | Default |
|----------|-------------|---------|
| `MYSQL_HOST` | Database host | - |
| `MYSQL_PORT` | Database port | 3306 |
| `MYSQL_USER` | Database user | - |
| `MYSQL_PASSWORD` | Database password | - |
| `MYSQL_DATABASE` | Database name | - |

### Deployment Settings (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `GIT_REPO` | Git repository URL | - |
| `GIT_BRANCH` | Git branch | main |
| `AUTO_UPDATE` | Auto-pull on startup | false |
| `USER_UPLOAD` | Skip install if files uploaded | false |
| `DEBUG` | Enable debug logging | false |
| `DISCORD_CLIENT_ID` | For command deployment | - |
| `DISCORD_GUILD_ID` | Development server ID | - |

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 256MB | 512MB - 1GB |
| CPU | 10% | 25% |
| Disk | 100MB | 250MB |
| Network | Minimal | Minimal |

## Monitoring & Logs

The bots provide detailed console output:

- **Startup**: Shows which bots are enabled/disabled
- **Status**: Regular updates when fetching server data
- **Errors**: Clear error messages with context
- **Shutdown**: Graceful shutdown messages

### Log Output Example

```
╔═══════════════════════════════════════════════════════╗
║   MotorStorm Status Bots - Unified Launcher v2.2      ║
╚═══════════════════════════════════════════════════════╝

📋 Bot Configuration:
   ✅ MotorStorm-AE: Enabled
   ✅ MotorStorm-Apoc: Enabled
   ❌ MotorStorm-PR: Disabled (no token)
   ❌ MotorStorm-MV: Disabled (no token)
   ✅ MotorStorm-Helper: Enabled

🔄 Database: Connected successfully

🚀 Starting bots...
   Starting MotorStorm-AE...
   ✅ MotorStorm-AE bot started successfully

🎮 All configured bots are running!
```

## Stopping the Bots

The bots handle shutdown signals gracefully:

1. **Pterodactyl Console**: Click the "Stop" button
2. **Terminal**: Press `Ctrl+C`
3. **Programmatic**: Send `SIGTERM` or `SIGINT`

All bots will:
- Stop status checking
- Clear intervals
- Disconnect from Discord
- Exit cleanly

## Troubleshooting

### Issue: Bots won't start

**Solution**: Check that:
- At least one bot token is configured
- Channel IDs are set for enabled bots
- Channel IDs are valid 18-digit Discord IDs
- Bot has permissions in the channels
- Node.js 20 is installed (or using nodejs_20 egg)

### Issue: "Channel not found" errors

**Solution**:
- Verify channel IDs are correct
- Ensure bot is in the Discord server
- Check bot has "View Channel" permission

### Issue: Build fails

**Solution**:
```bash
rm -rf node_modules dist
npm ci
npm run build
```
