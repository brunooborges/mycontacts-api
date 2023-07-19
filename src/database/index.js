const { Client } = require('pg');

const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

const client = new Client({
  host: 'babar.db.elephantsql.com',
  port: 5432,
  user: dbUser,
  password: dbPassword,
  database: 'nyoabbhg',
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

exports.query = async (query, values) => {
  const { rows } = await client.query(query, values);
  return rows;
};
