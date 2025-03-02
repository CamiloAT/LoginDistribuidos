import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login, forgotPassword } from '../services/authService';
import useAuth from '../hooks/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const {token, setToken} = useAuth();
    const [error, setError] = useState(null);
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
            alert(response.message);
            setShowForgot(false);
        } catch (error) {
            alert('Error al enviar el correo de recuperación');
            console.error(error)
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
                    <h3 className="text-xl font-semibold">Sign In</h3>
                    <p className="text-sm text-gray-500">
                        Use your email and password to sign in
                    </p>
                </div>
                
                <div className="bg-white px-4 py-8 sm:px-16">
                    {error && (error.includes("blocked") ? (
                        <div className="mb-4 rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-700">User is blocked because of too many failed login attempts.</p>
                        </div>
                    ) : (
                        <div className="mb-4 rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-700">Email or password wrong. Try again</p>
                        </div>   
                    ))}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email:
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password:
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Sign in
                        </button>
                        
                        <div className="flex items-center justify-between">
                            <button 
                                type="button"
                                onClick={() => setShowForgot(!showForgot)}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Forgot your password?
                            </button>
                        </div>
                        
                        {showForgot && (
                            <div className="mt-4 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                                <h3 className="text-md font-medium">Reset Password</h3>
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    Send recovery email
                                </button>
                            </div>
                        )}
                        
                        <p className="text-center text-sm text-gray-600">
                            {"Don't have an account? "}
                            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Sign up
                            </Link>
                            {' for free.'}
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;