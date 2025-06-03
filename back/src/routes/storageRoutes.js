import express from 'express';
import { upload as uploadController, images, deleteImage, getImageDescription } from '../controllers/storageController.js';

const router = express.Router();

router.post('/upload', uploadController);
router.post('/get-image-description', getImageDescription); // Assuming this is the same controller as uploadController

router.get("/images", images);
router.delete("/delete", deleteImage);
// router.get("/get-image", getImagesById);

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Holaaa' });
});

export default router;
