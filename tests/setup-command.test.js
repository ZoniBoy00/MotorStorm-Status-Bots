const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// /setup persists to data/ under the working directory; keep tests away from the repo's data/
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-setup-'));
process.chdir(workDir);
const { BaseBot } = require('../dist/core/base-bot.js');

class TestBot extends BaseBot {
  constructor() {
    super({
      token: 'token',
      channelIds: ['111111111111111111'],
      runtimeKey: 'test',
      statusCheckInterval: 20000,
      activityRotationInterval: 30000,
      debug: false,
      gameName: 'Test',
      apiEndpoint: 'https://example.invalid',
      dataKey: 'test',
    }, 'Test');
  }
  getActivities() { return [{ type: 3, message: 'test' }]; }
  async fetchServerData() { return null; }
  formatEmbed() { return null; }
  getTotalPlayers() { return 0; }
  getLobbies() { return []; }
}

function fakeInteraction({ inGuild = true, canManage = true } = {}) {
  const replies = [];
  return {
    replies,
    replied: false,
    deferred: false,
    commandName: 'setup',
    user: { tag: 'tester#0001' },
    isChatInputCommand: () => true,
    inGuild: () => inGuild,
    memberPermissions: inGuild ? { has: () => canManage } : null,
    options: {
      getChannel: () => ({ id: '222222222222222222', toString: () => '<#222222222222222222>' }),
    },
    reply: async (payload) => { replies.push(payload); },
  };
}

test('/setup is rejected without Manage Server permission', async () => {
  const bot = new TestBot();
  const interaction = fakeInteraction({ canManage: false });

  await bot.handleInteraction(interaction);

  assert.match(interaction.replies[0].content, /Manage Server/);
  assert.deepEqual(bot.config.channelIds, ['111111111111111111']);
  assert.equal(fs.existsSync(path.join(workDir, 'data', 'runtime-channels.json')), false);
  bot.client.destroy();
});

test('/setup is rejected outside a guild', async () => {
  const bot = new TestBot();
  const interaction = fakeInteraction({ inGuild: false });

  await bot.handleInteraction(interaction);

  assert.match(interaction.replies[0].content, /Manage Server/);
  assert.deepEqual(bot.config.channelIds, ['111111111111111111']);
  bot.client.destroy();
});

test('/setup adds and persists the channel for admins', async () => {
  const bot = new TestBot();
  const interaction = fakeInteraction();

  await bot.handleInteraction(interaction);

  assert.match(interaction.replies[0].content, /Status channel set/);
  assert.deepEqual(bot.config.channelIds, ['111111111111111111', '222222222222222222']);
  const saved = JSON.parse(fs.readFileSync(path.join(workDir, 'data', 'runtime-channels.json'), 'utf-8'));
  assert.deepEqual(saved, { test: ['222222222222222222'] });
  bot.client.destroy();
});
