import express from 'express';
import pool from './config/db.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        console.log(rows);
        res.json(rows);
        return rows;
      } catch (error) {
        res.status(500).json({ error: error.message });
        console.error('Error en la consulta:', error);
      }
});

// Export the app for use in index.js
export default app;