import nodemailer from 'nodemailer'
import { email_user, email_pass } from '../config/index.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: email_user,
        pass: email_pass,
    }
});

const sendRecoveryEmail = async (email, token) => {
    const url = `http://localhost:5173/reset-password/${token}`
    await transporter.sendMail({
        from: email_user,
        to: email,
        subject: 'Recuperacion de constraseña',
        text: `Haga cilc en el siguiente enlace para restablecer su contraseña: ${url}`
    })
}

export default sendRecoveryEmail;