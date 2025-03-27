import api from './api.js';

export const uploadImage = async (image) => {
  try {
    // Crear un objeto FormData y agregar la imagen
    const formData = new FormData();
    formData.append('image', image);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
