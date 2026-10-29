const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PSRewiredApiHandler,
  parsePsrPlayerName,
  parsePsrLobbyConfig,
} = require('../dist/core/psrewired-api-handler.js');

test('strips PSR hex prefixes from player names', () => {
  assert.equal(parsePsrPlayerName('fffff7fb-ZoniBoy0'), 'ZoniBoy0');
  assert.equal(parsePsrPlayerName('0-ZoniBoy0'), 'ZoniBoy0');
  assert.equal(parsePsrPlayerName('deadbeefPlayer'), 'Player');
  assert.equal(parsePsrPlayerName('Some-Player'), 'Some-Player');
  assert.equal(parsePsrPlayerName(''), 'Unknown');
  assert.equal(parsePsrPlayerName(undefined), 'Unknown');
});

test('parses lobby config from room names', () => {
  assert.deepEqual(parsePsrLobbyConfig('Race ~ Raingod Spires ~ 3 ~ Forward'), {
    gameMode: 'Race',
    track: 'Raingod Spires',
    lapCount: '3',
    direction: 'Forward',
  });
  assert.equal(parsePsrLobbyConfig('Plain lobby'), undefined);
});

class FakeHandler extends PSRewiredApiHandler {
  constructor(responses) {
    super({
      appId: '1',
      botName: 'Test',
      dataKey: 'motorstorm_test',
      defaultName: 'Test Game',
      defaultMaxPlayers: 12,
    });
    this.responses = responses;
  }

  async fetchWithRetry(url) {
    const key = Object.keys(this.responses).find((suffix) => url.endsWith(suffix));
    return key ? this.responses[key] : null;
  }
}

test('builds server data from rooms and players', async () => {
  const handler = new FakeHandler({
    '/rooms?applicationId=1': [{ id: 7, name: 'Room', playerCount: 2 }, { id: 8, name: 'Empty', playerCount: 0 }],
    '/universes/players?applicationId=1': [{ name: '0-Alice' }, { name: 'ff-Bob' }, { name: '1-Alice' }],
    '/universes?applicationId=1': [],
    '/rooms/7': { name: 'Race ~ Track ~ 3 ~ Reverse', playerCount: 2, players: [{ name: '0-Alice' }, { name: 'ff-Bob' }] },
    '/rooms/8': {},
  });

  const data = await handler.fetchData();
  const game = data.motorstorm_test;

  assert.equal(game.general_lobby.name, 'Test Game');
  assert.deepEqual(game.general_lobby.players, ['Alice', 'Bob']);
  assert.equal(game.summary.total_players, 2);
  assert.equal(game.summary.active_lobbies, 1);
  assert.equal(game.lobbies.length, 2);
  assert.deepEqual(game.lobbies[0].players, ['Alice', 'Bob']);
  assert.equal(game.lobbies[0].max_players, 12);
  assert.equal(game.lobbies[0].config.direction, 'Reverse');
  assert.equal(game.lobbies[1].is_active, false);
});

test('returns null when both rooms and players are unavailable', async () => {
  const handler = new FakeHandler({});
  assert.equal(await handler.fetchData(), null);
});
