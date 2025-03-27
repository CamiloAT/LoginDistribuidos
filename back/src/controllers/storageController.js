import { v4 } from 'uuid';
import { getBestContainerIP, uploadImageToContainer } from '../services/storageService.js';
import db from '../config/db.js';

export const upload = async (req, res) => {
  try {
    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({ message: 'Please provide a file' });
    }

    const userId = req.body.id_user;

    // Create a unique ID for the image
    const imageId = v4();

    // Upload the file to the best container 
    const uploadResult = await uploadImageToContainer(req.file, imageId);

    // Build the path to store in the database
    const downloadPath = `http://${uploadResult.containerIP}/download/${uploadResult.image.id}`;

    // Insert record into database
    await db.query(
      'INSERT INTO images (image_id, user_id, image_name, path) VALUES (?, ?, ?, ?)',
      [imageId, userId, req.file.originalname, downloadPath]
    );

    return res.status(201).json({ 
      imageId,
      downloadUrl: downloadPath 
    });
  } catch (error) {
    console.error('Error in upload:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Envía el archivo al servicio de almacenamiento con fetch.
 * Se construye un FormData con el archivo y el id de la imagen.
 * @param {Object} imageFile - Archivo recibido (asegúrate de que tenga .buffer, .name, etc.)
 * @param {string} id_image - ID único asignado a la imagen.
 * @returns {Promise<Object>} - Objeto con la respuesta del contenedor, incluyendo el IP.
 */
export const uploadImage = async (imageFile, id_image) => {
  try {
    // Obtén la IP del contenedor con más espacio disponible
    const bestContainerIP = await getBestContainerIP();
    if (!bestContainerIP) {
      throw new Error('No available containers for upload');
    }

    // Construye un FormData y agrega los campos necesarios
    const formData = new FormData();
    formData.append('id_image', id_image);
    // Aquí asumimos que imageFile tiene una propiedad buffer (para archivos subidos vía Multer o similar)
    // y que file.name contiene el nombre original.
    formData.append('image', imageFile.buffer, { filename: imageFile.name });

    // Envía la petición POST al servicio de almacenamiento
    const response = await fetch(`http://${bestContainerIP}/upload`, {
      method: 'POST',
      body: formData,
      // Nota: No es necesario definir headers para multipart/form-data; 
      // el paquete form-data se encarga de eso.
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    // Retorna la respuesta del contenedor
    const data = await response.json();
    return {
      containerIP: bestContainerIP,
      ...data,
    };
  } catch (error) {
    console.error('Error uploading image to container:', error.message);
    throw error;
  }
};
