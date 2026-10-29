const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadRuntimeChannels, saveRuntimeChannel } = require('../dist/utils/runtime-channels.js');

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-runtime-'));
  return path.join(dir, 'data', 'runtime-channels.json');
}

test('returns empty config when the file does not exist', () => {
  assert.deepEqual(loadRuntimeChannels(tempFile()), {});
});

test('saves channels per bot and skips duplicates', () => {
  const file = tempFile();
  assert.equal(saveRuntimeChannel('ae', '123456789012345678', file), true);
  assert.equal(saveRuntimeChannel('ae', '123456789012345678', file), false);
  assert.equal(saveRuntimeChannel('pr', '223456789012345678', file), true);
  assert.deepEqual(loadRuntimeChannels(file), {
    ae: ['123456789012345678'],
    pr: ['223456789012345678'],
  });
});

test('rejects invalid channel IDs', () => {
  assert.throws(() => saveRuntimeChannel('ae', '../etc', tempFile()), /Invalid channel ID/);
});

test('ignores malformed files and invalid entries', () => {
  const file = tempFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  fs.writeFileSync(file, '{not json');
  assert.deepEqual(loadRuntimeChannels(file), {});

  fs.writeFileSync(file, JSON.stringify({ ae: ['123456789012345678', 'abc', 5], mv: 'nope' }));
  assert.deepEqual(loadRuntimeChannels(file), { ae: ['123456789012345678'] });
});
