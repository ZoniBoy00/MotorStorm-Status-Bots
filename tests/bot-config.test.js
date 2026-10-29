const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Runtime channels are resolved relative to the working directory; keep tests away from the repo's data/
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(), 'ms-config-')));
const { buildStatusBotConfig } = require('../dist/utils/bot-config.js');

const definition = {
  envSuffix: 'AE',
  runtimeKey: 'ae',
  gameName: 'MotorStorm Arctic Edge',
  apiEndpoint: 'https://example.invalid/api',
  dataKey: 'motorstorm_ae',
};

test('requires a token', () => {
  assert.throws(() => buildStatusBotConfig(definition, { CHANNEL_IDS_AE: '1' }), /DISCORD_TOKEN_AE/);
});

test('requires at least one channel', () => {
  assert.throws(() => buildStatusBotConfig(definition, { DISCORD_TOKEN_AE: 't' }), /CHANNEL_IDS_AE/);
});

test('parses env values and deduplicates channels', () => {
  const config = buildStatusBotConfig(definition, {
    DISCORD_TOKEN_AE: 'token',
    CHANNEL_IDS_AE: ' 111 , 222,111,, ',
    NOTIFICATION_CHANNEL_AE: '333',
    NOTIFICATION_ROLE_AE: '444',
    NOTIFICATION_PINGS_AE: 'true',
  });

  assert.equal(config.token, 'token');
  assert.deepEqual(config.channelIds, ['111', '222']);
  assert.equal(config.runtimeKey, 'ae');
  assert.equal(config.notificationChannelId, '333');
  assert.equal(config.notificationRoleId, '444');
  assert.equal(config.notificationPingsEnabled, true);
  assert.equal(config.debug, false);
});

test('merges channels added at runtime', () => {
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/runtime-channels.json', JSON.stringify({ ae: ['123456789012345678'] }));

  const config = buildStatusBotConfig(definition, { DISCORD_TOKEN_AE: 'token' });
  assert.deepEqual(config.channelIds, ['123456789012345678']);
});
