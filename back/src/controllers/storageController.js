import { v4 as uuidv4 } from 'uuid';
import { uploadImageToContainer } from '../services/storageService.js';
import { readPool, writePool } from '../config/db.js';
import { upload as uploadMiddleware } from '../config/multerConfig.js';

import { description_ia_url, ipAddress } from '../config/index.js';

const cpUpload = uploadMiddleware.fields([
  { name: 'id_user', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

export const upload = async (req, res) => {
  cpUpload(req, res, async function (err) {
    let uploadResult;
    try {
      // 1. Error in Multer middleware
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message });
      }

      // 2. Validar que venga archivo
      if (!req.files || !req.files.image || !req.files.image[0]) {
        return res.status(400).json({ message: 'Please provide a file' });
      }

      const file = req.files.image[0];
      const userId = req.body.id_user || 'anonymous';

      console.log(
        `Processing upload for file: ${file.originalname}, size: ${file.size} bytes`
      );

      // 3. Verificar buffer
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ message: 'Empty file provided' });
      }

      // 4. Crear un ID único para la imagen
      const imageId = uuidv4();

      // 5. Intentar enviar el archivo al contenedor
      try {
        uploadResult = await uploadImageToContainer(file, imageId);
        console.log('Upload to container successful:', uploadResult);
      } catch (uploadError) {
        console.error('Upload to container failed:', uploadError);
        return res.status(500).json({
          message: 'Upload to storage container failed',
          error: uploadError.message,
        });
      }

      console.log("RESULTADO", uploadResult)

      // 6. Construir la ruta de descarga
      //    uploadResult.containerIP debería venir de uploadImageToContainer
      //    uploadResult.image.id = imageId (usamos el mismo ID)
      const downloadPath = `http://${ipAddress}:${uploadResult.image.portByContainer}/image/${imageId}`;

      console.log("sunga", downloadPath)

      // 7. Intentar insertar registro en BD
      try {
        await writePool.query(
          'INSERT INTO images (image_id, user_id, image_name, path) VALUES (?, ?, ?, ?)',
          [imageId, userId, file.originalname, downloadPath]
        );

        return res.status(201).json({
          imageId,
          downloadUrl: downloadPath,
        });
      } catch (dbError) {
        console.error('Database insert failed:', dbError);

        // 8. Si falla el INSERT, intentamos borrar la imagen del contenedor para no dejarla huérfana
        try {
          await fetch(`http://${ipAddress}:${uploadResult.image.portByContainer}/delete/${imageId}`, {
            method: 'DELETE',
          });
          console.log(
            `Cleanup: image ${imageId} deleted from container after DB failure.`
          );
        } catch (cleanupError) {
          console.error(
            `Cleanup failed: could not delete image ${imageId} from container:`,
            cleanupError
          );
        }

        return res.status(500).json({
          message: 'Upload failed: database operation failed',
          error: dbError.message,
        });
      }
    } catch (unexpectedError) {
      console.error('Unexpected error in upload controller:', unexpectedError);

      // Si ocurrió después de que la imagen ya llegó al contenedor, intentamos cleanup
      if (uploadResult && uploadResult.image.portByContainer) {
        try {
          await fetch(
            `http://${ipAddress}:${uploadResult.image.portByContainer}/delete/${uploadResult.image.id}`,
            { method: 'DELETE' }
          );
          console.log(
            `Cleanup (unexpected): image ${uploadResult.image.id} deleted from container.`
          );
        } catch (cleanupError) {
          console.error(
            `Cleanup (unexpected) failed for image ${uploadResult.image.id}:`,
            cleanupError
          );
        }
      }

      return res.status(500).json({
        message: 'Server error during upload',
        details: unexpectedError.message,
      });
    }
  });
};

export const images = async (req, res) => {
  try {
    // Query to fetch all images from the database
    const [rows] = await readPool.query(
      'SELECT image_id, path, user_id FROM images ORDER BY creation_date DESC'
    );
    
    // Return the list of images
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching images:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error fetching images', 
      details: error.message 
    });
  }
};

export const deleteImage = async (req, res) => {
  let connection; // para la transacción
  try {
    const { imageId } = req.query;
    if (!imageId) {
      return res.status(400).json({ message: 'Image ID is required' });
    }

    // 1. Obtengo info de la imagen (puede hacerse con readPool normal)
    const [imageRows] = await readPool.query(
      'SELECT * FROM images WHERE image_id = ?',
      [imageId]
    );

    if (imageRows.length === 0) {
      return res.status(404).json({ message: 'Image not found in database' });
    }
    const image = imageRows[0];

    // 2. Extraigo el host/IP del contenedor a partir del path
    const containerUrl = new URL(image.path);
    const containerHost = containerUrl.host; // puede incluir puerto si lo tenía

    // 3. Inicio transacción en BD (con writePool)
    connection = await writePool.getConnection();
    await connection.beginTransaction();

    // 4. Elimino el registro en BD, pero aún no confirmo (COMMIT)
    //    De esta forma, si falla la petición HTTP, haré ROLLBACK y la fila volverá a existir.
    const responseDelete = await connection.query('DELETE FROM images WHERE image_id = ?', [imageId]);

    console.log("HAJSKDKKD",responseDelete)

    // 5. Intento llamar al endpoint DELETE del contenedor remoto
    const containerResponse = await fetch(`http://${containerHost}/delete/${imageId}`, {
      method: 'DELETE',
    });
    if (!containerResponse.ok) {
      // Si el contenedor devuelve error, leo el body para más info y lanzo excepción
      let errorData;
      try {
        errorData = await containerResponse.json();
      } catch {
        errorData = { error: 'Unknown error (no JSON)' };
      }
      throw new Error(`Container returned error: ${errorData.error || 'Unknown error'}`);
    }

    // 6. Si la petición al contenedor fue OK, confirmo transacción
    await connection.commit();
    connection.release();

    return res.status(200).json({ message: 'Image deleted successfully' });

  } catch (err) {
    console.error('Error deleting image:', err);

    // Si algo falló después de beginTransaction, hago rollback para dejar la BD consistente
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Rollback error:', rollbackErr);
      }
      connection.release();
    }

    // Ya quedó la base de datos como antes y el contenedor NO borró (o no se llegó a confirmar)
    return res.status(500).json({
      message: 'Failed to delete image',
      details: err.message,
    });
  }
};

export const getImageDescription = async (req, res) => {
  cpUpload(req, res, async function (err) {
    try {
      // 1. Error in Multer middleware
      console.log('entrando al paso 1')
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message });
      }

      // 2. Validar que venga archivo
      console.log('entrando al paso 2')
      if (!req.files || !req.files.image || !req.files.image[0]) {
        return res.status(400).json({ message: 'Please provide a file' });
      }

      const file = req.files.image[0];

      // 3. Verificar buffer
      console.log('entrando al paso 3')
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ message: 'Empty file provided' });
      }

      // Create form data for the API request
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('image', blob, file.originalname);

      // Send request to description-ia API
      const response = await fetch(description_ia_url + "/upload", {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);

    } catch (error) {
      console.error('Error getting image description:', error);
      res.status(500).json({ 
        message: 'Failed to get image description',
        details: error.message 
      });
    }
  });
};


// export const getImagesById = async (req, res) => {
//   try {
//     const { idImage, ipContainer } = req.query;
    
//     // Validate required parameters
//     if (!idImage) {
//       return res.status(400).json({ message: 'Image ID is required' });
//     }
    
//     if (!ipContainer) {
//       return res.status(400).json({ message: 'Container IP is required' });
//     }
    
//     // Fetch the image from the container
//     const response = await getImageByIdForContainer(idImage, ipContainer);
    
//     // Forward the response
//     const contentType = response.headers.get('content-type');
//     const buffer = await response.arrayBuffer();
    
//     res.set('Content-Type', contentType);
//     return res.send(Buffer.from(buffer));
//   } catch (error) {
//     console.error('Error fetching image by ID:', error);
//     return res.status(500).json({ 
//       message: 'Failed to fetch image', 
//       details: error.message 
//     });
//   }
// };