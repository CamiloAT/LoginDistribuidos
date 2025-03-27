import express from 'express';
import { upload as uploadController, images, deleteImage } from '../controllers/storageController.js';

const router = express.Router();

router.post('/upload', uploadController);
router.get("/images", images);
router.delete("/delete", deleteImage);
// router.get("/get-image", getImagesById);

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Holaaa' });
});

export default router;
