const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDatabase } = require('../src/database');

function fakePool() {
  const created = [];

  class FakePool {
    constructor(options) {
      this.options = options;
      this.listeners = {};
      this.queries = [];
      created.push(this);
    }

    on(event, listener) {
      this.listeners[event] = listener;
    }

    async query(text, values) {
      this.queries.push({ text, values });
      return { rows: [{ id: 1 }] };
    }

    async end() {
      this.ended = true;
    }
  }

  return { FakePool, created };
}

test('does not open a connection until the first query', () => {
  const { FakePool, created } = fakePool();

  createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });

  assert.equal(created.length, 0);
});

test('connects with the URL, verified SSL and small pool settings suited to a free database', async () => {
  const { FakePool, created } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });

  await db.query('SELECT 1');

  assert.equal(created.length, 1);
  assert.equal(created[0].options.connectionString, 'postgres://x');
  assert.deepEqual(created[0].options.ssl, { rejectUnauthorized: true });
  assert.ok(created[0].options.max <= 5);
  assert.ok(created[0].options.idleTimeoutMillis > 0);
  assert.ok(created[0].options.connectionTimeoutMillis >= 10000);
});

test('can turn SSL off for a local database', async () => {
  const { FakePool, created } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://localhost/x', ssl: false });

  await db.query('SELECT 1');

  assert.equal(created[0].options.ssl, false);
});

test('reuses one pool and returns the rows, as the repositories expect', async () => {
  const { FakePool, created } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });

  const rows = await db.query('SELECT $1', ['a']);
  await db.query('SELECT 2');

  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(created.length, 1);
  assert.deepEqual(created[0].queries[0], { text: 'SELECT $1', values: ['a'] });
});

test('survives the database dropping an idle connection (a free database sleeps), instead of crashing', async () => {
  const { FakePool, created } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });
  await db.query('SELECT 1');

  assert.equal(typeof created[0].listeners.error, 'function');
  assert.doesNotThrow(() => created[0].listeners.error(new Error('Connection terminated unexpectedly')));
});

test('closes the pool on request', async () => {
  const { FakePool, created } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });
  await db.query('SELECT 1');

  await db.close();

  assert.equal(created[0].ended, true);
});

test('closing before any query is harmless', async () => {
  const { FakePool } = fakePool();
  const db = createDatabase({ PoolClass: FakePool, connectionString: 'postgres://x', ssl: true });

  await assert.doesNotReject(db.close());
});
