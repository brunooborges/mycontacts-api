const DEFAULT_PORT = 3001;

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'https://brunooborges.github.io'];

/** A whole number >= 0, or the fallback. */
function toCount(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function toPort(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : DEFAULT_PORT;
}

function toOrigins(value) {
  if (!value) {
    return DEFAULT_ORIGINS;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Everything the API reads from the environment, in one place. */
function loadConfig(env = process.env) {
  return {
    port: toPort(env.PORT),
    databaseUrl: env.DATABASE_URL,
    // SSL stays on (a hosted database needs it); only an explicit "false" turns it off locally.
    databaseSsl: env.DATABASE_SSL !== 'false',
    allowedOrigins: toOrigins(env.ALLOWED_ORIGINS),
    // How many proxies sit in front of the API (the host's load balancer is one), so the visitor's
    // real address, not the proxy's, is what the rate limiter counts.
    trustProxy: env.TRUST_PROXY === undefined ? 1 : toCount(env.TRUST_PROXY, 1),
  };
}

/** Fails at startup, with a clear message, instead of at the first request. */
function assertConfig(config) {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Set it to the Postgres connection string of the database.');
  }
}

module.exports = { loadConfig, assertConfig, DEFAULT_ORIGINS, DEFAULT_PORT };
