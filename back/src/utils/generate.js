import jwt from 'jsonwebtoken';
import { jwt_secret } from '../config/index.js';

export const generateToken = (userId, email) => {
    return jwt.sign({ userId, email }, jwt_secret, { expiresIn: '1h' });
}