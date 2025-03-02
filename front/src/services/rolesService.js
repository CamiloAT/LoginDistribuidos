import api from './api.js';

export const getRoles = async () => {
    try {
        const response = await api('/roles', {
            method: 'GET'
        });
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

export const getRolesByUserId = async (userId) => {
    try {
        const response = await api(`/roles-user/${userId}`, {
            method: 'GET'
        });
        return response.data;
    } catch (error) {
        console.error(error);
    }
}

export const updateUserRoles = async (userId, roles) => {
    try {
        const response = await api(`/roles-user/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ roles })
        });
        return response.data;
    } catch (error) {
        console.error(error);
    }
}