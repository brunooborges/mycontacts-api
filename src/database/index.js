const { Pool } = require('pg');

const { loadConfig } = require('../config');

/**
 * A small wrapper around a pg pool that opens its connection on the first query.
 * Settings suit a free hosted database: few connections, short idle time, and a long enough
 * connect timeout to wake a database that was asleep.
 */
function createDatabase({ PoolClass = Pool, connectionString, ssl = true }) {
  let pool;

  function getPool() {
    if (!pool) {
      pool = new PoolClass({
        connectionString,
        ssl: ssl ? { rejectUnauthorized: true } : false,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 20000,
      });

      // A free database drops idle connections when it goes to sleep. pg reports that as an
      // 'error' event on the pool; without a listener it would crash the whole process.
      pool.on('error', (error) => {
        console.log('Database connection dropped, a new one will be opened:', error.message);
      });
    }

    return pool;
  }

  return {
    async query(text, values) {
      const { rows } = await getPool().query(text, values);
      return rows;
    },

    async close() {
      if (pool) {
        await pool.end();
      }
    },
  };
}

const config = loadConfig();

module.exports = createDatabase({ connectionString: config.databaseUrl, ssl: config.databaseSsl });
module.exports.createDatabase = createDatabase;
