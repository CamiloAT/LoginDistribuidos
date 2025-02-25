import { useState } from 'react';

import { login } from '../services/authService';

import useAuth from '../hooks/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const {token, setToken} = useAuth()
    const [error, setError] = useState(null)

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
            </form>
        </div>
    );
};

export default Login;