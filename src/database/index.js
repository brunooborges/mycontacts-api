const { Client } = require('pg');

const dbPassword = process.env.DB_PASSWORD;

const client = new Client({
  host: 'babar.db.elephantsql.com',
  port: 5432,
  user: 'nyoabbhg',
  password: dbPassword,
  database: 'nyoabbhg',
});

client.connect();

exports.query = async (query, values) => {
  const { rows } = await client.query(query, values);
  return rows;
};
