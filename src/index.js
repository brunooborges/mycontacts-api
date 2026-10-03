const { createApp } = require('./app');
const { loadConfig, assertConfig } = require('./config');

const config = loadConfig();

assertConfig(config);

const app = createApp({
  allowedOrigins: config.allowedOrigins,
  trustProxy: config.trustProxy,
});

app.listen(config.port, () => {
  console.log(`Server started successfully on port ${config.port}`);
});
