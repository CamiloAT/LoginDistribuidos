import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

const app = express();

app.use(cors());

// Monta primero las rutas que reciben multipart/form-data para evitar que sean procesadas por body-parser
app.use('/api/storage', storageRoutes);

// Luego, para el resto de las rutas, aplica body parser
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);

console.log(process.env.MYSQL_URI);

export default app;
