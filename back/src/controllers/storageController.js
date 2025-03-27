import { v4 as uuidv4 } from 'uuid';
import { uploadImageToContainer } from '../services/storageService.js';
import db from '../config/db.js';
import { upload as uploadMiddleware } from '../config/multerConfig.js';

const cpUpload = uploadMiddleware.fields([
  { name: 'id_user', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

export const upload = async (req, res) => {
  cpUpload(req, res, async function (err) {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: err.message });
      }
      
      // Check if image file was provided
      if (!req.files || !req.files.image || !req.files.image[0]) {
        return res.status(400).json({ message: 'Please provide a file' });
      }
      
      const file = req.files.image[0];
      const userId = req.body.id_user || 'anonymous'; // Default if missing
      
      console.log(`Processing upload for file: ${file.originalname}, size: ${file.size} bytes`);
      
      // Ensure file has a buffer
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ message: 'Empty file provided' });
      }
      
      // Create a unique ID for the image
      const imageId = uuidv4();
      
      try {
        // Send the file to the storage container
        const uploadResult = await uploadImageToContainer(file, imageId);
        
        console.log('Upload successful:', uploadResult);
        
        // Build the download path
        const downloadPath = `http://${uploadResult.containerIP}/image/${uploadResult.image.id}`;
        
        // Store record in database
        await db.query(
          'INSERT INTO images (image_id, user_id, image_name, path) VALUES (?, ?, ?, ?)',
          [imageId, userId, file.originalname, downloadPath]
        );
        
        return res.status(201).json({ 
          imageId,
          downloadUrl: downloadPath 
        });
      } catch (uploadError) {
        console.error('Upload operation failed:', uploadError);
        return res.status(500).json({ 
          message: 'Upload failed', 
          error: uploadError.message 
        });
      }
    } catch (error) {
      console.error('Unexpected error in upload controller:', error);
      return res.status(500).json({ message: 'Server error', details: error.message });
    }
  });
};

export const images = async (req, res) => {
  try {
    // Query to fetch all images from the database
    const [rows] = await db.query(
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
  try {

    const { imageId } = req.query;
    
    if (!imageId) {
      return res.status(400).json({ message: 'Image ID is required' });
    }
    
    // Get the image info from the database
    const [imageRows] = await db.query(
      'SELECT * FROM images WHERE image_id = ?',
      [imageId]
    );
    
    if (imageRows.length === 0) {
      return res.status(404).json({ message: 'Image not found in database' });
    }
    
    const image = imageRows[0];
    
    // Extract container IP from the path
    // Assuming path is in format: http://CONTAINER_IP/image/IMAGE_ID
    const containerUrl = new URL(image.path);
    const containerIP = containerUrl.host;
    
    // Call the container's delete endpoint
    const response = await fetch(`http://${containerIP}/delete/${imageId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Container returned error: ${errorData.error || 'Unknown error'}`);
    }
    
    // Remove the image record from the database
    await db.query('DELETE FROM images WHERE image_id = ?', [imageId]);
    
    return res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({
      message: 'Failed to delete image',
      details: error.message
    });
  }
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