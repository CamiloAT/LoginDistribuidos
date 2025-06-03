import { upload } from '../config/multerConfig.js';
import { description_ia_url } from '../config/index.js';
import fetch from 'node-fetch';

export const getImageDescription = async (req, res) => {
    try {
        // Use multer single file upload with 'image' field
        upload.single('image')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No image file provided' });
            }

            // Create form data for the API request
            const formData = new FormData();
            const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
            formData.append('image', blob, req.file.originalname);

            // Send request to description-ia API
            const response = await fetch(description_ia_url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }

            const data = await response.json();
            res.json(data);

        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};