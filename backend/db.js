require('dotenv').config();
const mysql = require('mysql2');

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'mridul',
  password: process.env.DB_PASSWORD || '1991', // Add your MySQL password here
  database: process.env.DB_NAME || 'dbms_project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// For using promises with async/await
const promisePool = pool.promise();

module.exports = promisePool;
