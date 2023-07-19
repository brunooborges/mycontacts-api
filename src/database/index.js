const { Client } = require('pg');

const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

(async () => {
  const client = new Client({
    host: 'containers-us-west-139.railway.app',
    port: 6108,
    user: dbUser,
    password: dbPassword,
    database: 'railway',
    ssl: true,
  });

  await client.connect();
  const res = await client.query('SELECT $1::text as connected', [
    'Connection to postgres successful!',
  ]);
  console.log(res.rows[0].connected);
  await client.end();
})();
