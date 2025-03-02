import express from 'express';
import { updateUserRoles, listRoles, getUserRoles, getUserData, register, login, forgotPassword, resetPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/roles', listRoles)
router.get('/role-user/:id', getUserRoles)
router.put('/role_user', updateUserRoles)
router.get('/user/:email', getUserData)

export default router;
