# MotorStorm Status Bots - TypeScript Edition

Professional TypeScript Discord bots for monitoring MotorStorm server status across four games:

- **MotorStorm Arctic Edge** (AE)
- **MotorStorm Apocalypse** (Apoc)
- **MotorStorm Pacific Rift** (PR)
- **MotorStorm Monument Valley** (MV)

## Features

- ✅ **TypeScript** - Full type safety with strict mode enabled
- ✅ **Multi-Channel Support** - Each bot can post to multiple Discord channels
- ✅ **Unified Launcher** - Start all bots with a single command
- ✅ **Independent Operation** - Each bot runs with its own token and configuration
- ✅ **Graceful Shutdown** - Clean exit handling with proper cleanup
- ✅ **Optimized Performance** - Parallel channel updates and minimal resource usage
- ✅ **Comprehensive Error Handling** - Retry logic and detailed logging
- ✅ **Activity Rotation** - Dynamic bot status updates
- ✅ **Colorized Console** - Beautiful, organized console output with color coding
- ✅ **Modern Discord.js** - Uses latest Events API (no deprecation warnings)

## Installation

### Prerequisites

- Node.js 18+ or higher
- npm or yarn
- Discord Bot tokens for each game you want to monitor

### Setup

1. **Install dependencies:**

```bash
cd MotorStorm-Status-Bots
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the `MotorStorm-Status-Bots` directory:

```env
# MotorStorm Arctic Edge Bot
DISCORD_TOKEN_AE=your_ae_bot_token_here
DISCORD_CHANNEL_IDS_AE=channel_id_1,channel_id_2

# MotorStorm Apocalypse Bot
DISCORD_TOKEN_APOC=your_apoc_bot_token_here
DISCORD_CHANNEL_IDS_APOC=channel_id_1,channel_id_2

# MotorStorm Pacific Rift Bot
DISCORD_TOKEN_PR=your_pr_bot_token_here
DISCORD_CHANNEL_IDS_PR=channel_id_1,channel_id_2

# MotorStorm Monument Valley Bot
DISCORD_TOKEN_MV=your_mv_bot_token_here
DISCORD_CHANNEL_IDS_MV=channel_id_1,channel_id_2

# Debug mode (true/false)
DEBUG=false
```

## Usage

### Start All Bots

Run all configured bots simultaneously:

```bash
npm start
```

This will start all bots that have valid tokens configured. Bots without tokens will be automatically skipped.

### Start Individual Bots

Run bots individually for testing:

```bash
npm run start:ae      # Arctic Edge only
npm run start:apoc    # Apocalypse only
npm run start:pr      # Pacific Rift only
npm run start:mv      # Monument Valley only
```

### Development Mode

Use ts-node for faster development iteration:

```bash
npm run start:dev
```

### Build for Production

Compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled files will be in the `dist` directory.

## Project Structure

```
TS_BOTS/
├── src/
│   ├── bots/                    # Individual bot implementations
│   │   ├── motorstorm-ae/       # Arctic Edge bot
│   │   ├── motorstorm-apoc/     # Apocalypse bot
│   │   ├── motorstorm-pr/       # Pacific Rift bot
│   │   └── motorstorm-mv/       # Monument Valley bot
│   ├── core/                    # Shared base classes
│   │   ├── base-bot.ts          # Abstract bot framework
│   │   └── api-client.ts        # HTTP client with retry logic
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts             # Shared interfaces and types
│   ├── utils/                   # Utility functions
│   │   ├── logger.ts            # Enhanced logging with colors
│   │   ├── message-manager.ts   # Discord message persistence
│   │   └── name-simplifier.ts   # Player name parsing
│   └── index.ts                 # Unified launcher entry point
├── data/                        # Runtime data (message IDs)
├── dist/                        # Compiled JavaScript (after build)
├── Dockerfile                   # Docker container definition
├── pterodactyl-egg.json         # Pterodactyl Panel egg configuration
├── PTERODACTYL.md               # Pterodactyl deployment guide
├── .env                         # Environment configuration
├── .env.example                 # Example environment file
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Architecture

### BaseBot Class

All bots extend the `BaseBot` abstract class which provides:

- Multi-channel message management
- Activity rotation with player count updates
- Status check intervals with parallel processing
- Error handling and retry logic
- Graceful shutdown with cleanup
- Modern Discord.js Events API integration

### Multi-Channel Support

Each bot can monitor multiple Discord channels. Configure channels in the `.env` file:

```env
DISCORD_CHANNEL_IDS_AE=1234567890,0987654321,1122334455
```

The bot will create and maintain a separate status message in each channel. Channel updates are processed in parallel for optimal performance.

### Performance Optimizations

- **Parallel Channel Updates**: All channels update simultaneously instead of sequentially
- **Promise.allSettled**: Failures in one channel don't affect others
- **Minimal API Calls**: Data is fetched once and reused for all channels
- **Efficient Memory Usage**: Shared code reduces memory footprint
- **Clean Event Handling**: Uses Discord.js Events constants for better performance

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN_*` | Discord bot token for each game | Required |
| `DISCORD_CHANNEL_IDS_*` | Comma-separated list of channel IDs | See `.env.example` |
| `DEBUG` | Enable debug logging | `false` |

### Intervals

- **Status Check**: 10 seconds
- **Activity Rotation**: 30 seconds

To modify these, edit the config files in each bot's directory (e.g., `src/bots/motorstorm-ae/config.ts`).

## API Endpoints

- **Arctic Edge**: `https://svo.agracingfoundation.org/medius_db/api`
- **Apocalypse**: `http://api.psorg-web-revival.us:61920`
- **Pacific Rift**: `https://api.psrewired.com/us/api`
- **Monument Valley**: `https://api.psrewired.com/us/api`

## Error Handling

- Automatic retry with exponential backoff (up to 3 attempts)
- Graceful degradation if APIs are unavailable
- Per-channel error isolation (one channel failure doesn't affect others)
- Comprehensive logging with color-coded severity levels
- Clean error messages without stack traces in production

## Performance & Resources

- **Memory Usage**: ~50-100MB per bot
- **CPU Usage**: <5% average (spikes to ~10% during updates)
- **Network**: Minimal (API calls every 10 seconds)
- **Startup Time**: ~2-5 seconds per bot
- **Channel Update Time**: <1 second for parallel updates

## Console Output

The bots feature beautiful, color-coded console output:

- 🟢 Green: Success messages and ready status
- 🔵 Blue: Informational messages and status updates
- 🟡 Yellow: Warnings and skipped operations
- 🔴 Red: Errors and failures
- 🟣 Cyan: Headers and decorative elements

## Troubleshooting

### TypeScript Compilation

All TypeScript errors have been resolved. If you encounter build errors:

```bash
rm -rf node_modules dist
npm install
npm run build
```

### Bot Won't Start

- Verify at least one `DISCORD_TOKEN_*` environment variable is set
- Check that channel IDs are valid 18-digit Discord IDs
- Ensure the bot is a member of your Discord server
- Verify bot permissions (View Channels, Send Messages, Embed Links)

### Channel Not Found

- Double-check channel IDs are correct
- Ensure bot has "View Channel" permission
- Verify the bot is in the server where the channels exist

### API Connection Issues

- Check if the game servers are online
- Verify your network allows outbound HTTP/HTTPS connections
- Enable `DEBUG=true` for detailed API request logs

## Development

### Adding a New Bot

1. Create a new directory in `src/bots/`
2. Implement API handler, embed builder, config, and bot class
3. Extend `BaseBot` and implement all abstract methods
4. Add bot import to `src/index.ts`
5. Add environment variables to `.env.example`
6. Update README

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use async/await instead of promises
- Handle all errors gracefully

## Contributing

Contributions are welcome! Please ensure:

1. TypeScript strict mode compliance
2. Consistent code formatting
3. No breaking changes to the BaseBot interface
4. Update documentation for new features
5. Test with all four bots before submitting

## Credits

Developed by ZoniBoy00

Special thanks to the MotorStorm community and server operators.

## License

MIT License - See LICENSE file for details
