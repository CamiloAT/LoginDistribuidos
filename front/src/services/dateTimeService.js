import api from './api.js';

export const getCurrentTime = async () => {
  try {
    const response = await api('time/current', {
        method: 'GET'
    });

    return response;
  } catch (error) {
    console.error(error);
  }
}