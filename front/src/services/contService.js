import api from './api.js';

export const uploadImage = async (file, user_id) => {
  try {
    const formData = new FormData();
    formData.append('user_id', user_id);
    formData.append('file', file);

    const response = await api('storage/upload', formData, {
        method: "POST",
        body: formData
    });
    
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteImage = async (idImage) => {
  try {
    const response = await api(`storage/delete/${idImage}`, {
        method: 'POST'
    });

    return response;
  } catch (error) {
    console.error(error);
  }
}