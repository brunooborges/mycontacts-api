const rateLimit = require('express-rate-limit');

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function tooManyRequests(request, response) {
  response.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
}

function createLimiter(options) {
  return rateLimit({
    // Retry-After and the RateLimit headers tell a client when it may try again.
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: tooManyRequests,
    ...options,
  });
}

/**
 * Two budgets per visitor address: a generous one for everything, and a tighter one for writes
 * (POST, PUT, DELETE), which are what an open demo could be flooded with. Reads and the browser's
 * preflight requests never spend the write budget. Counters live in memory, which is enough for a
 * single free instance; they reset when it restarts.
 */
module.exports = function createRateLimiters({ windowMs, general, writes }) {
  return [
    createLimiter({ windowMs, limit: general }),
    createLimiter({
      windowMs,
      limit: writes,
      skip: (request) => READ_METHODS.includes(request.method),
    }),
  ];
};
