import api from './api.js';

export const getUserByEmail = async (email) => {
  try {
    const response = await api(`auth/user/${email}`, {
        method: 'GET'
    });

    return response;
  } catch (error) {
    console.error(error);
  }
}