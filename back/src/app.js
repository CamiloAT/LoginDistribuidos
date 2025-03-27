import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(process.env.MYSQL_URI)

app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);


// Export the app for use in index.js
export default app;