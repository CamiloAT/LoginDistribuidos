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
        const downloadPath = `http://${uploadResult.containerIP}/download/${uploadResult.image.id}`;
        
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