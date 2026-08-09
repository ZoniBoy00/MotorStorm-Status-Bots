/**
 * Diagnostic utilities for troubleshooting bot configuration
 */

export function logEnvironmentVariables(): void {
  console.log('\n\x1b[36m╔═══════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║        Environment Variable Diagnostics               ║\x1b[0m');
  console.log('\x1b[36m╚═══════════════════════════════════════════════════════╝\x1b[0m\n');

  const envVars = [
    // Arctic Edge
    { name: 'DISCORD_TOKEN_AE', masked: true },
    { name: 'CHANNEL_IDS_AE', masked: false },
    { name: 'NOTIFICATION_CHANNEL_AE', masked: false },
    { name: 'NOTIFICATION_ROLE_AE', masked: false },
    // Apocalypse
    { name: 'DISCORD_TOKEN_APOC', masked: true },
    { name: 'CHANNEL_IDS_APOC', masked: false },
    { name: 'NOTIFICATION_CHANNEL_APOC', masked: false },
    { name: 'NOTIFICATION_ROLE_APOC', masked: false },
    // Pacific Rift
    { name: 'DISCORD_TOKEN_PR', masked: true },
    { name: 'CHANNEL_IDS_PR', masked: false },
    { name: 'NOTIFICATION_CHANNEL_PR', masked: false },
    { name: 'NOTIFICATION_ROLE_PR', masked: false },
    // Monument Valley
    { name: 'DISCORD_TOKEN_MV', masked: true },
    { name: 'CHANNEL_IDS_MV', masked: false },
    { name: 'NOTIFICATION_CHANNEL_MV', masked: false },
    { name: 'NOTIFICATION_ROLE_MV', masked: false },
    // Global
    { name: 'DEBUG', masked: false },
    { name: 'PTERODACTYL_CONTAINER', masked: false },
  ];

  envVars.forEach(({ name, masked }) => {
    const value = process.env[name];
    if (value) {
      const displayValue = masked ? `${value.substring(0, 10)}...` : value;
      console.log(`  \x1b[32m✓\x1b[0m ${name.padEnd(30)} = \x1b[33m${displayValue}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${name.padEnd(30)} = \x1b[90m(not set)\x1b[0m`);
    }
  });

  console.log('\n');
}

export function logBotConfig(botName: string, config: any): void {
  console.log(`\n\x1b[36m[${botName}] Configuration:\x1b[0m`);
  console.log(`  Token: ${config.token ? '\x1b[32mSET\x1b[0m' : '\x1b[31mNOT SET\x1b[0m'}`);
  console.log(`  Channel IDs: \x1b[33m${config.channelIds.join(', ')}\x1b[0m`);
  console.log(`  Notification Channel: ${config.notificationChannelId || '\x1b[90m(not configured)\x1b[0m'}`);
  console.log(`  Notification Role: ${config.notificationRoleId || '\x1b[90m(not configured)\x1b[0m'}`);
  console.log(`  Notifications: ${config.notificationChannelId && config.notificationRoleId ? '\x1b[32mENABLED\x1b[0m' : '\x1b[33mDISABLED\x1b[0m'}`);
  console.log(`  Debug: ${config.debug ? '\x1b[32mON\x1b[0m' : '\x1b[90mOFF\x1b[0m'}\n`);
}
