import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { register, login, forgotPassword, resetPassword, updateUserRoles } from '../src/controllers/authController.js';
import { readPool, writePool } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../src/utils/generate.js';
import sendRecoveryEmail from '../src/utils/mailer.js';

// Mock dependencies
vi.mock('../src/config/db.js', () => ({
    readPool: {
        query: vi.fn()
    },
    writePool: {
        query: vi.fn(),
        getConnection: vi.fn()
    }
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn()
    }
}));

vi.mock('../src/utils/generate.js', () => ({
    generateToken: vi.fn(),
    verifyToken: vi.fn()
}));

vi.mock('../src/utils/mailer.js', () => ({
    default: vi.fn()
}));

vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mock-uuid-123')
}));

describe('AuthController Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            ip: '127.0.0.1',
            params: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        vi.clearAllMocks();
    });

    // Test 1: Registro exitoso de usuario
    describe('register', () => {
        it('should register a new user successfully', async () => {
            req.body = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };

            // Mock database responses - usar el formato correcto
            readPool.query
                .mockResolvedValueOnce([[]]) // No existing user
                .mockResolvedValueOnce([[{ role_id: 'role-123' }]]); // Role query

            writePool.query
                .mockResolvedValueOnce([]) // Insert user
                .mockResolvedValueOnce([]) // Insert access history
                .mockResolvedValueOnce([]); // Insert user role

            bcrypt.hash.mockResolvedValue('hashed-password');
            generateToken.mockReturnValue('jwt-token');

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ token: 'jwt-token' });
        });

        // Test 2: Registro con email ya existente
        it('should return error when email already exists', async () => {
            req.body = {
                name: 'John Doe',
                email: 'existing@example.com',
                password: 'password123'
            };

            readPool.query.mockResolvedValueOnce([[{ email: 'existing@example.com' }]]);

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Email already in use' });
        });

        // Test extra: Registro con datos faltantes
        it('should return error when required fields are missing', async () => {
            req.body = {
                name: 'John Doe',
                email: 'john@example.com'
                // password missing
            };

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Please provide name, email, and password'
            });
        });
    });

    // Test 3: Login exitoso
    describe('login', () => {
        it('should login user successfully', async () => {
            req.body = {
                email: 'john@example.com',
                password: 'password123'
            };

            const mockUser = {
                user_id: 'user-123',
                email: 'john@example.com',
                password_hash: 'hashed-password',
                status: 'active',
                failed_attempts: 0
            };

            readPool.query
                .mockResolvedValueOnce([[mockUser]]) // User query
                .mockResolvedValueOnce([[{ role_id: 'role-123', name: 'user' }]]); // Roles query

            writePool.query
                .mockResolvedValueOnce([]) // Insert access history
                .mockResolvedValueOnce([]); // Reset failed attempts

            bcrypt.compare.mockResolvedValue(true);
            generateToken.mockReturnValue('jwt-token');

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ token: 'jwt-token' });
        });

        // Test 4: Login con usuario bloqueado
        it('should reject login for blocked user', async () => {
            req.body = {
                email: 'blocked@example.com',
                password: 'password123'
            };

            const mockUser = {
                user_id: 'user-123',
                status: 'blocked'
            };

            readPool.query.mockResolvedValueOnce([[mockUser]]);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'User is blocked' });
        });

        // Test extra: Login con usuario inexistente
        it('should return error when user does not exist', async () => {
            req.body = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };

            readPool.query.mockResolvedValueOnce([[]]);

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        });
    });

    // Test 5: Recuperación de contraseña
    describe('forgotPassword', () => {
        it('should send recovery email successfully', async () => {
            req.body = { email: 'john@example.com' };

            const mockUser = {
                user_id: 'user-123',
                email: 'john@example.com'
            };

            readPool.query
                .mockResolvedValueOnce([[mockUser]]) // User query
                .mockResolvedValueOnce([[{ role_id: 'role-123' }]]); // Roles query

            generateToken.mockReturnValue('recovery-token');
            sendRecoveryEmail.mockResolvedValue();

            await forgotPassword(req, res);

            expect(sendRecoveryEmail).toHaveBeenCalledWith('john@example.com', 'recovery-token');
            expect(res.json).toHaveBeenCalledWith({ message: 'Correo de recuperacion enviado' });
        });
    });

    // Test 6: Reset de contraseña
    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            req.params = { token: 'valid-token' };
            req.body = { password: 'newPassword123' };

            verifyToken.mockReturnValue({ userId: 'user-123' });
            bcrypt.hash.mockResolvedValue('new-hashed-password');
            writePool.query.mockResolvedValue();

            await resetPassword(req, res);

            expect(res.json).toHaveBeenCalledWith({ message: 'Constraseña actualizada correctamente' });
        });
    });
});
