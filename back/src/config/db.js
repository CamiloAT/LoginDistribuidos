// db.js
import mysql from 'mysql2/promise';

const writePool = mysql.createPool({
  uri: process.env.MYSQL_WRITE_URI,
  connectionLimit: 10,
});

const readPool = mysql.createPool({
  uri: process.env.MYSQL_READ_URI,
  connectionLimit: 10,
});

export { writePool, readPool };