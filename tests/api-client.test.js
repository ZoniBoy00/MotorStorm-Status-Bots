const test = require('node:test');
const assert = require('node:assert/strict');
const { ApiClient } = require('../dist/core/api-client.js');

class TestClient extends ApiClient {
  parse(value) {
    return this.parseXML(value);
  }

  fetch(url) {
    return this.fetchWithRetry(url, 0);
  }
}

test('parses valid XML', async () => {
  const client = new TestClient('Test');
  const result = await client.parse('<root><value>ok</value></root>');
  assert.equal(result.root.value, 'ok');
});

test('rejects malformed XML', async () => {
  const client = new TestClient('Test');
  await assert.rejects(() => client.parse('<root>'), /Unclosed root tag|Unexpected close tag|Invalid/);
});

test('rejects invalid API URLs without a network request', async () => {
  const client = new TestClient('Test');
  assert.equal(await client.fetch('file:///etc/passwd'), null);
});
