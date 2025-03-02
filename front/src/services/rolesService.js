import api from './api.js';

export const getRoles = async () => {
    try {
        const response = await api('auth/roles', {
            method: 'GET'
        });
        return response;
    } catch (error) {
        console.error(error);
    }
}

export const getRolesByUserId = async (userId) => {
    try {
        const response = await api(`auth/role-user/${userId}`, {
            method: 'GET'
        });
        return response;
    } catch (error) {
        console.error(error);
    }
}

export const updateUserRoles = async (userId, roles) => {
    try {
        const response = await api(`auth/change-role-user`, {
            method: 'POST',
            body: JSON.stringify({ id: userId, roles })
        });
        console.log(response)
        return response;
    } catch (error) {
        console.error(error);
    }
}