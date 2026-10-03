const express = require('express');
require('express-async-errors');

const routes = require('./routes');
const createCors = require('./app/middlewares/cors');
const createRateLimiters = require('./app/middlewares/rateLimit');
const errorHandler = require('./app/middlewares/errorHandler');
const { DEFAULT_ORIGINS } = require('./config');

const DEFAULT_LIMITS = { windowMs: 60 * 1000, general: 120, writes: 20 };
const MAX_BODY_SIZE = '10kb';

function createApp({
  router = routes,
  allowedOrigins = DEFAULT_ORIGINS,
  trustProxy = 1,
  limits = DEFAULT_LIMITS,
} = {}) {
  const app = express();

  app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');

  app.use(createCors(allowedOrigins));

  // The wake-up check of the front end: no database, no rate limit.
  app.get('/health', (request, response) => response.json({ status: 'ok' }));

  // Limit before parsing, so a flood is turned away without reading its bodies.
  app.use(createRateLimiters(limits));
  app.use(express.json({ limit: MAX_BODY_SIZE }));
  app.use(router);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
