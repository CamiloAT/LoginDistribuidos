import api from './api.js';

export const getUserByEmail = async (email) => {
  try {
    const response = await api(`/user/${email}`, {
        method: 'GET'
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
}