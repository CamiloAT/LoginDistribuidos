import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Home = () => {
    const { logout, getRoles, getUser } = useAuth();
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        // You could implement this getUser function in your auth context 
        // or replace with whatever user info you have
        const userData = getUser ? getUser() : { name: "User" };
        setUser(userData);
    }, [getUser]);

    // Function to check if role is admin
    const isAdmin = (roleName) => {
        const role = roleName.toLowerCase();
        return role === 'admin' || role === 'administrator';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <button 
                        onClick={logout}
                        className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Logout
                    </button>
                </div>
            </header>
            
            {/* Main content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Welcome card */}
                <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
                    <div className="px-4 py-5 sm:px-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Welcome, {user?.name || 'User'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Thank you for using our distributed authentication system.
                        </p>
                    </div>
                </div>
                
                {/* Roles section */}
                <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Roles</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {getRoles().length > 0 ? (
                                getRoles().map((role, index) => (
                                    <li key={role.role_id || index} className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-indigo-600 truncate">
                                                    {role.name || role}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    ID: {role.role_id || 'N/A'}
                                                </p>
                                                {isAdmin(role.name || role) && (
                                                    <Link 
                                                        to="/admin" 
                                                        className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                                    >
                                                        Admin Panel
                                                        <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </Link>
                                                )}
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="px-6 py-4 text-sm text-gray-500">
                                    No roles assigned
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
                
                {/* Additional info card */}
                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">Session Information</h3>
                            <div className="mt-3 text-sm text-gray-500">
                                <p>Your session is secure and protected.</p>
                                <p className="mt-2">Last login: {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
                            <div className="mt-3 text-sm text-gray-500">
                                <p>If you need assistance, please contact our support team.</p>
                                <a 
                                    href="#" 
                                    className="mt-3 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    Contact Support
                                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;