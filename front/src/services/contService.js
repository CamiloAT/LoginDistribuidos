import api from './api.js';

export const uploadImage = async (file, user_id) => {
  try {
    console.log(user_id)
    console.log(file)

    // Create form data using the form-data package
    const formData = new FormData();
    formData.append('id_user', user_id.toString());
    
    // Append the file
    formData.append('image', file);
    
    const response = await api('storage/upload', {
        method: "POST",
        body: formData
    });
    
    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAllImages = async () => {
  try {
    const response = await api('storage/images', {
        method: 'GET'
    });

    return response;
  } catch (error) {
    console.error(error);
  }
}

// export const getImage = async (idImage, ipContainer) => {
//   try {
//     const url = `storage/get-image?idImage=${idImage}&ipContainer=${ipContainer}`;
//     const response = await api(url, {
//       method: 'GET',
//     });
//     return response;
//   } catch (error) {
//     console.error(error);
//   }
// };

export const getUserImages = async (idUser) => {
  try {
    const response = await api(`storage/images/${idUser}`, {
        method: 'GET'
    });

    return response;
  } catch (error) {
    console.error(error);
  }
};

export const getImageDescription = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file); // Adjunta el archivo de imagen

    const response = await api('storage/get-image-description', {
      method: 'POST',
      body: formData,
    });

    return response;
  } catch (error) {
    console.error('Error obteniendo descripción de IA:', error);
    throw error;
  }
};

export const deleteImage = async (idImage) => {

  console.log("id: " + idImage)

  try {
    const response = await api(`storage/delete?imageId=${idImage}`, {
      method: 'DELETE'
    });

    return response;
  } catch (error) {
    console.error(error);
    throw error;
  }
};


