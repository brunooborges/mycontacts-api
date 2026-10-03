const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';
const PREFLIGHT_MAX_AGE_SECONDS = '600';

/** Lets the allowed front ends call the API from a browser; answers their preflight requests. */
module.exports = function createCors(allowedOrigins) {
  return (request, response, next) => {
    const origin = request.header('Origin');

    // The answer depends on who asks, so caches must not share it between origins.
    response.vary('Origin');

    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);

      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        response.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE_SECONDS);
        response.sendStatus(204);
        return;
      }
    }

    next();
  };
};
