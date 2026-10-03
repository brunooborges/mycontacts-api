# MyContacts API

A small contacts API (Node.js, Express, PostgreSQL). Its front end is
[mycontacts-front-end](https://github.com/brunooborges/mycontacts-front-end).

## Configuration

Everything comes from environment variables. Nothing secret is kept in the code.

| Variable | Required | Default | What it is |
|---|---|---|---|
| `DATABASE_URL` | yes | none | Postgres connection string. The API refuses to start without it. |
| `PORT` | no | `3001` | Port to listen on. Hosts such as Render set it for you. |
| `ALLOWED_ORIGINS` | no | localhost and `https://brunooborges.github.io` | Comma-separated origins allowed to call the API from a browser. |
| `DATABASE_SSL` | no | `true` | Set to `false` only for a local database without SSL. |
| `TRUST_PROXY` | no | `1` | Number of proxies in front of the API, so rate limits count the visitor's real address. |

## Run it

```bash
yarn
DATABASE_URL=postgres://... DATABASE_SSL=false yarn start   # local database
yarn test                                                    # unit tests, no database needed
```

## Database

For a local database use `src/database/schema.sql`. For a hosted one (for example a free Neon
project) use `src/database/schema.hosted.sql`: the same tables without `CREATE DATABASE`. Run it once,
in the provider's SQL editor or with `psql "$DATABASE_URL" -f src/database/schema.hosted.sql`.

A free hosted database goes to sleep when idle and wakes on the first query, which can take a second
or two. Idle connections it drops are handled, so the API keeps running.

## Deploying on Render

- Build command: `yarn`
- Start command: `yarn start`
- Environment: set `DATABASE_URL` (use the database's *pooled* connection string if it offers one).
  Set `ALLOWED_ORIGINS` only if the front end is served from another origin.
- A free Render service sleeps after 15 minutes without traffic and takes about a minute to wake.
  `GET /health` answers without touching the database, which is what a front end can ping to wake
  it up.

## Protections

- **Rate limits**, counted per visitor address in memory (enough for a single instance, reset on
  restart): 120 requests per minute for everything, and 20 per minute for writes (POST, PUT,
  DELETE). Over the limit the API answers `429` with a `Retry-After` header, and the CORS headers
  are kept so the browser can read the answer. `/health` is never limited.
- Request bodies are limited to 10 kb. Malformed JSON and oversized bodies get `400` and `413`.
- CORS only allows the origins in `ALLOWED_ORIGINS`, and answers preflight requests itself.
