import mysql from 'mysql2/promise';
import { uri_db as uri } from './index.js';

const pool = mysql.createPool({
    uri,
    connectionLimit: 10, 
  });
  
  export default pool;