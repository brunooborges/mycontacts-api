const { Client } = require('pg');

const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

const client = new Client({
  host: 'containers-us-west-139.railway.app',
  port: 6108,
  user: dbUser,
  password: dbPassword,
  database: 'railway',
});

client.connect();

exports.query = async (query, values) => {
  const { rows } = await client.query(query, values);
  return rows;
};
