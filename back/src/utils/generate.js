import jwt from 'jsonwebtoken';
import { jwt_secret } from '../config/index.js';

export const generateToken = (userId, email, roles) => {
    return jwt.sign({ userId, email, roles }, jwt_secret, { expiresIn: '1h' });
}

export const verifyToken = (token) => {
    return jwt.verify(token, jwt_secret)
}   