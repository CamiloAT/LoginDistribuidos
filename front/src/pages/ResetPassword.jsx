import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        
        try {
            const response = await api(`auth/reset-password/${token}`, {
                method: "POST",
                body: JSON.stringify({ password })
            });
            setMessage(response.message || "Password updated successfully");
            setTimeout(() => navigate("/login"), 3000);
        } catch (error) {
            setError("Failed to reset password. Please try again.");
            console.error(error);
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
                <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
                    <h3 className="text-xl font-semibold">Reset Password</h3>
                    <p className="text-sm text-gray-500">
                        Please enter your new password
                    </p>
                </div>
                
                <div className="bg-white px-4 py-8 sm:px-16">
                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                    
                    {message && (
                        <div className="mb-4 rounded-md bg-green-50 p-4">
                            <p className="text-sm text-green-700">{message}</p>
                            <p className="mt-1 text-xs text-green-600">Redirecting to login page...</p>
                        </div>
                    )}
                    
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                New Password:
                            </label>
                            <input
                                type="password"
                                id="password"
                                placeholder="Enter your new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                Confirm Password:
                            </label>
                            <input
                                type="password"
                                id="confirm-password"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                            Update Password
                        </button>
                        
                        <p className="text-center text-sm text-gray-600">
                            Remember your password?{" "}
                            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                                Sign in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;