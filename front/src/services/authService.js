import api from './api.js';

export const login = async (email, pass) => {
    try {
        const response = await api("auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password: pass })
        })

        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export const register = async(name, email, pass) => {
    try {
        const response = await api("auth/register", {
            method: "POST",
            body: JSON.stringify({ name, email, password: pass })
        });

        return response;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const forgotPassword = async ({ email }) => {
    try {
        const response = await api("auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({email})
        })
        console.log(response)
        return response;
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        throw error;
    }
};