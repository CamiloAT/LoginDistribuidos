import { readPool, writePool } from '../config/db.js';
import { v4 } from 'uuid';
import bcrypt from 'bcryptjs';
import sendRecoveryEmail from '../utils/mailer.js';

import { generateToken, verifyToken } from '../utils/generate.js';

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    try {
        // Read operation
        const [existingUser] = await readPool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const emailRegex = /\S+@\S+\.\S+/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = v4();
        const creationDate = new Date();

        // Write operations
        await writePool.query(
            'INSERT INTO users (user_id, name, email, password_hash, status, creation_date, failed_attempts) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, name, email, hashedPassword, 'active', creationDate, 0]
        );

        const accessId = v4();
        const ipAddress = req.ip;
        const accessDate = new Date();
        const accessSuccessful = 1;

        await writePool.query(
            'INSERT INTO access_history (access_id, user_id, ip_address, access_date, access_successful) VALUES (?, ?, ?, ?, ?)',
            [accessId, userId, ipAddress, accessDate, accessSuccessful]
        );

        const roleName = 'visitor';
        const [roleResult] = await readPool.query(
            'SELECT role_id FROM roles WHERE name = ?',
            [roleName]
        );

        console.log(roleResult[0].role_id)

        await writePool.query(
            'INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) VALUES (?, ?, ?, ?)',
            [v4(), userId, roleResult[0].role_id, accessDate]
        )

        const token = generateToken(userId, email, [roleName]);
        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const [existingUser] = await readPool.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const user = existingUser[0];

        if (user.status === 'blocked') {
            return res.status(400).json({ message: 'User is blocked' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        const accessId = v4();
        const ipAddress = req.ip;
        const accessDate = new Date();
        let accessSuccessful = 0;

        if (!passwordMatch) {
            await writePool.query(
                'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE user_id = ?',
                [user.user_id]
            );
            console.log("Failed attempts: " + user.failed_attempts);
            if (user.failed_attempts >= 5) {
                console.log("Blocking user");
                await writePool.query(
                    'UPDATE users SET status = ? WHERE user_id = ?',
                    ['blocked', user.user_id]
                );
            }
            await writePool.query(
                'INSERT INTO access_history (access_id, user_id, ip_address, access_date, access_successful) VALUES (?, ?, ?, ?, ?)',
                [accessId, user.user_id, ipAddress, accessDate, accessSuccessful]
            )

            console.log("mensaje error")
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        await writePool.query(
            'INSERT INTO access_history (access_id, user_id, ip_address, access_date, access_successful) VALUES (?, ?, ?, ?, ?)',
            [accessId, user.user_id, ipAddress, accessDate, accessSuccessful]
        );

        await writePool.query(
            'UPDATE users SET failed_attempts = 0 WHERE user_id = ?',
            [user.user_id]
        )

        const [roles] = await readPool.query(
            'SELECT r.* FROM roles r INNER JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = ?',
            [user.user_id]
        );

        const token = generateToken(user.user_id, email, roles);
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
}

export const forgotPassword = async (req, res) => {
    const { email } = req.body
    const [existingUser] = await readPool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser.length === 0) {
        return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = existingUser[0];

    const [roles] = await readPool.query(
        'SELECT r.* FROM roles r INNER JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = ?',
        [user.user_id]
    );

    const token = generateToken(user.user_id, email, roles)
    await sendRecoveryEmail(email, token)
    res.json({ message: 'Correo de recuperacion enviado' })
}

export const resetPassword = async (req, res) => {
    const { token } = req.params
    const { password } = req.body
    try {
        const decoded = verifyToken(token)
        const hashedPassword = await bcrypt.hash(password, 10)
        await writePool.query(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [hashedPassword, decoded.userId]
        )
        res.json({ message: 'Constraseña actualizada correctamente' })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Invalid or expired token' })
    }
}

export const listRoles = async (req, res) => {
    try {
        const roles = await readPool.query(
            'SELECT * FROM roles'
        )
        res.json(roles[0])
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error to bring roles from database' })
    }
}

export const getUserRoles = async (req, res) => {
    const userId = req.params.id
    try {
        const [roles] = await readPool.query(
            "SELECT r.role_id FROM roles r JOIN user_roles ur ON r.role_id = ur.role_id WHERE ur.user_id = ?",
            [userId]
        )
        res.status(200).json(roles)
    } catch (error) {
        console.error('Error al obtener usuario: ', error)
        res.status(500).json({ message: 'Error al obtener rol del usuario' })
    }
}

export const getUserData = async (req, res) => {
    const email = req.params.email;
    try {
        const [existingUser] = await readPool.query('SELECT user_id, name, email FROM users WHERE email = ?', [email]);
        if (!existingUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(existingUser[0]);
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
}

export const updateUserRoles = async (req, res) => {
    const { id, roles } = req.body;
    const accessDate = new Date();

    try {
        await writePool.query(
            'DELETE FROM user_roles WHERE user_id = ?',
            [id]
        )

        // Insert each role for the user
        for (const roleId of roles) {
            await writePool.query(
                'INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) VALUES (?, ?, ?, ?)',
                [v4(), id, roleId, accessDate]
            );
        }

        res.json({ message: 'Roles actualizados correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar roles del usuario:', error);
        res.status(500).json({ message: 'Error al actualizar roles del usuario' });
    }
}