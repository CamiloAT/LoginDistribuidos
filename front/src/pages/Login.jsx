import { useState } from 'react';

import { login, forgotPassword } from '../services/authService';

import useAuth from '../hooks/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const {token, setToken} = useAuth()
    const [error, setError] = useState(null)
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await login(email, password)
            setToken(data.token);
            console.log(token);
            window.location.reload();
        } catch(error) {
            setError(error)
        }
    };

    const handleForgotPassword = async () => {
        try {
            const response = await forgotPassword({ 
                email: forgotEmail 
            });
            console.log(1)
            alert(response.message);
            console.log(2)
            setShowForgot(false);
            console.log(3)
        } catch (error) {
            alert('Error al enviar el correo de recuperación');
            console.error(error)
        }
    };

    return (
        <div className="login-container">
            {error && (error.includes("blocked") ? (
                    <div className="alert alert-danger">
                        <p style={{color: "red"}}>User is blocked because of too many failed login attempts.</p>
                    </div>
                ) : (
                    <div className="alert alert-danger">
                        <p style={{color: "red"}}>Email or password wrong. Try again</p>
                    </div>   
                ))
            }
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Login</button>
                <button onClick={() => setShowForgot(!showForgot)}>
                    ¿Olvidó su contraseña?
                </button>
                {showForgot && (
                    <div>
                    <h3>Recuperar Contraseña</h3>
                    <input
                        type="email"
                        placeholder="Ingrese su correo"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <button onClick={handleForgotPassword}>Enviar correo</button>
                    </div>
                )}
            </form>
        </div>
    );

};

export default Login;