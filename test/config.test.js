const { test } = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig, assertConfig, DEFAULT_ORIGINS } = require('../src/config');

test('uses safe defaults when nothing is set', () => {
  const config = loadConfig({});

  assert.equal(config.port, 3001);
  assert.equal(config.databaseUrl, undefined);
  assert.equal(config.databaseSsl, true);
  assert.deepEqual(config.allowedOrigins, DEFAULT_ORIGINS);
  assert.equal(config.trustProxy, 1);
});

test('reads the port, database and origins from the environment', () => {
  const config = loadConfig({
    PORT: '10000',
    DATABASE_URL: 'postgres://user:pass@host/db',
    ALLOWED_ORIGINS: 'https://a.example, https://b.example ,',
    TRUST_PROXY: '2',
  });

  assert.equal(config.port, 10000);
  assert.equal(config.databaseUrl, 'postgres://user:pass@host/db');
  assert.deepEqual(config.allowedOrigins, ['https://a.example', 'https://b.example']);
  assert.equal(config.trustProxy, 2);
});

test('keeps SSL on for the database unless it is explicitly turned off for local development', () => {
  assert.equal(loadConfig({ DATABASE_SSL: 'false' }).databaseSsl, false);
  assert.equal(loadConfig({ DATABASE_SSL: 'true' }).databaseSsl, true);
  assert.equal(loadConfig({ DATABASE_SSL: 'anything' }).databaseSsl, true);
});

test('falls back to one proxy hop when TRUST_PROXY is not a whole number', () => {
  assert.equal(loadConfig({ TRUST_PROXY: 'lots' }).trustProxy, 1);
  assert.equal(loadConfig({ TRUST_PROXY: '-1' }).trustProxy, 1);
  assert.equal(loadConfig({ TRUST_PROXY: '0' }).trustProxy, 0);
});

test('falls back to the default port when PORT is not a number', () => {
  assert.equal(loadConfig({ PORT: 'abc' }).port, 3001);
});

test('refuses to start without a database URL, and says so', () => {
  assert.throws(() => assertConfig(loadConfig({})), /DATABASE_URL/);
  assert.doesNotThrow(() => assertConfig(loadConfig({ DATABASE_URL: 'postgres://x' })));
});

test('never puts the database URL in the error message', () => {
  const secret = 'postgres://user:hunter2@host/db';

  try {
    assertConfig({ ...loadConfig({}), databaseUrl: '' });
  } catch (error) {
    assert.doesNotMatch(error.message, new RegExp(secret));
  }
});
