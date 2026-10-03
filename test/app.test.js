/* eslint-disable no-await-in-loop, no-console -- requests are sent one after another on purpose */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Router } = require('express');

const { createApp } = require('../src/app');

const ORIGIN = 'https://brunooborges.github.io';

function fakeRouter() {
  const router = Router();
  router.get('/contacts', (req, res) => res.json([{ id: '1' }]));
  router.post('/contacts', (req, res) => res.status(201).json(req.body));
  router.put('/contacts/:id', (req, res) => res.json({ id: req.params.id }));
  router.delete('/contacts/:id', (req, res) => res.sendStatus(204));
  router.get('/boom', () => {
    throw new Error('secret internal detail');
  });
  return router;
}

async function withServer(options, run) {
  const app = createApp({
    router: fakeRouter(),
    allowedOrigins: [ORIGIN, 'http://localhost:3000'],
    trustProxy: 1,
    limits: { windowMs: 60000, general: 100, writes: 100 },
    ...options,
  });
  const server = await new Promise((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    await run((path, init = {}) => fetch(`${base}${path}`, init));
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

test('answers /health without touching the database, for the wake-up check', async () => {
  await withServer({}, async (request) => {
    const response = await request('/health', { headers: { Origin: ORIGIN } });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  });
});

test('never rate-limits /health, and does not let it eat the visitor budget', async () => {
  await withServer({ limits: { windowMs: 60000, general: 2, writes: 2 } }, async (request) => {
    for (let i = 0; i < 10; i += 1) {
      const response = await request('/health');
      assert.equal(response.status, 200);
    }

    assert.equal((await request('/contacts')).status, 200);
  });
});

test('allows the configured origins and no others', async () => {
  await withServer({}, async (request) => {
    const allowed = await request('/contacts', { headers: { Origin: ORIGIN } });
    const other = await request('/contacts', { headers: { Origin: 'https://evil.example' } });

    assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(allowed.headers.get('vary') ?? '', /Origin/i);
    assert.equal(other.headers.get('access-control-allow-origin'), null);
  });
});

test('answers a preflight request itself, with explicit methods and headers', async () => {
  await withServer({}, async (request) => {
    const response = await request('/contacts/1', {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
    assert.match(response.headers.get('access-control-allow-methods'), /PUT/);
    assert.match(response.headers.get('access-control-allow-methods'), /DELETE/);
    assert.match(response.headers.get('access-control-allow-headers'), /Content-Type/i);
  });
});

test('limits each visitor to a number of requests per window, answering 429 with Retry-After', async () => {
  await withServer({ limits: { windowMs: 60000, general: 3, writes: 100 } }, async (request) => {
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await request('/contacts')).status, 200);
    }

    const blocked = await request('/contacts', { headers: { Origin: ORIGIN } });

    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.match(await blocked.text(), /Too many requests/);
  });
});

test('keeps the browser able to read the 429, so the demo can show a friendly message', async () => {
  await withServer({ limits: { windowMs: 60000, general: 1, writes: 100 } }, async (request) => {
    await request('/contacts');

    const blocked = await request('/contacts', { headers: { Origin: ORIGIN } });

    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('access-control-allow-origin'), ORIGIN);
  });
});

test('counts visitors separately by their real address behind the proxy', async () => {
  await withServer({ limits: { windowMs: 60000, general: 1, writes: 100 } }, async (request) => {
    const first = await request('/contacts', { headers: { 'X-Forwarded-For': '203.0.113.1' } });
    const sameAgain = await request('/contacts', { headers: { 'X-Forwarded-For': '203.0.113.1' } });
    const someoneElse = await request('/contacts', { headers: { 'X-Forwarded-For': '203.0.113.2' } });

    assert.equal(first.status, 200);
    assert.equal(sameAgain.status, 429);
    assert.equal(someoneElse.status, 200);
  });
});

test('holds writes to a tighter budget than reads, and reads do not spend it', async () => {
  await withServer({ limits: { windowMs: 60000, general: 100, writes: 2 } }, async (request) => {
    const json = { 'Content-Type': 'application/json' };

    for (let i = 0; i < 5; i += 1) {
      assert.equal((await request('/contacts')).status, 200);
    }
    assert.equal((await request('/contacts', { method: 'POST', headers: json, body: '{"a":1}' })).status, 201);
    assert.equal((await request('/contacts/1', { method: 'PUT', headers: json, body: '{"a":1}' })).status, 200);
    assert.equal((await request('/contacts/1', { method: 'DELETE' })).status, 429);
    assert.equal((await request('/contacts')).status, 200);
  });
});

test('does not count preflight requests against the write budget', async () => {
  await withServer({ limits: { windowMs: 60000, general: 100, writes: 1 } }, async (request) => {
    for (let i = 0; i < 4; i += 1) {
      const preflight = await request('/contacts', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' },
      });
      assert.equal(preflight.status, 204);
    }

    const json = { 'Content-Type': 'application/json' };
    assert.equal((await request('/contacts', { method: 'POST', headers: json, body: '{}' })).status, 201);
  });
});

test('rejects a body over 10 kb with 413, not a server error', async () => {
  await withServer({}, async (request) => {
    const body = JSON.stringify({ note: 'x'.repeat(11 * 1024) });

    const response = await request('/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

    assert.equal(response.status, 413);
  });
});

test('rejects malformed JSON with 400, not a server error', async () => {
  await withServer({}, async (request) => {
    const response = await request('/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });

    assert.equal(response.status, 400);
  });
});

test('hides the details of unexpected errors', async () => {
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    await withServer({}, async (request) => {
      const response = await request('/boom');

      assert.equal(response.status, 500);
      assert.doesNotMatch(await response.text(), /secret internal detail/);
    });
  } finally {
    console.log = originalLog;
  }
});

test('answers 404 for unknown routes and does not advertise the framework', async () => {
  await withServer({}, async (request) => {
    const response = await request('/nope');

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});
