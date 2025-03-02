import { useState } from "react";
import { Link } from "react-router-dom";
import { getUserByEmail } from "../services/userService";
import { getRolesByUserId, getRoles, updateUserRoles } from "../services/rolesService";

const Admin = () => {
    const [email, setEmail] = useState('');
    const [user, setUser] = useState(null);
    const [roles, setRoles] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const searchUser = async () => {
        try {
            setError(null);
            const userData = await getUserByEmail(email);
            const userRoles = await getRolesByUserId(userData.user_id);
            const allRoles = await getRoles();

            setRoles(allRoles);
            setSelectedRoles(userRoles.map(role => role.role_id));
            setHasChanges(false);

            setUser({
                ...userData,
                roles: userRoles
            });
        } catch (error) {
            setError("User not found or an error occurred");
            setUser(null);
            console.error(error);
        }
    }
    
    const handleRoleChange = (roleId) => {
        setHasChanges(true);
        setSuccess(null);
        if (selectedRoles.includes(roleId)) {
            setSelectedRoles(selectedRoles.filter(id => id !== roleId));
        } else {
            setSelectedRoles([...selectedRoles, roleId]);
        }
    };
    
    const updateRoles = async () => {
        try {
            await updateUserRoles(user.user_id, selectedRoles);
            // Actualizar los roles del usuario después de guardar
            const updatedUserRoles = await getRolesByUserId(user.user_id);
            setUser({
                ...user,
                roles: updatedUserRoles
            });
            setHasChanges(false);
            setSuccess("User roles updated successfully");
        } catch (error) {
            setError("Failed to update roles");
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <Link 
                        to="/home" 
                        className="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Back to Home
                    </Link>
                </div>
            </header>
            
            {/* Main content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Welcome card */}
                <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
                    <div className="px-4 py-5 sm:px-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            User Management
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Search for users and manage their roles.
                        </p>
                    </div>
                </div>
                
                {/* Search section */}
                <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
                    <div className="px-4 py-5 sm:p-6">
                        <label htmlFor="email-search" className="block text-sm font-medium text-gray-700 mb-2">
                            Search User by Email
                        </label>
                        <div className="flex space-x-4">
                            <input 
                                type="email" 
                                id="email-search"
                                placeholder="Enter user email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                            />
                            <button 
                                onClick={searchUser}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Search
                            </button>
                        </div>
                        
                        {error && (
                            <div className="mt-4 rounded-md bg-red-50 p-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                        
                        {success && (
                            <div className="mt-4 rounded-md bg-green-50 p-4">
                                <p className="text-sm text-green-700">{success}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* User info and roles */}
                {user && (
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <p className="text-sm font-medium text-gray-500">Name</p>
                                    <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <p className="text-sm font-medium text-gray-500">Email</p>
                                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                                </div>
                            </div>
                            
                            {roles.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Roles</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Role
                                                    </th>
                                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Assigned
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {roles.map(role => (
                                                    <tr key={role.role_id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {role.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedRoles.includes(role.role_id)}
                                                                onChange={() => handleRoleChange(role.role_id)}
                                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6">
                                        <button 
                                            onClick={updateRoles} 
                                            disabled={!hasChanges}
                                            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                                                hasChanges 
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                                                    : 'bg-gray-300 cursor-not-allowed'
                                            }`}
                                        >
                                            Update Roles
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Admin;