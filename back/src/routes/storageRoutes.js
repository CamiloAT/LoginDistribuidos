import express from 'express';
import { upload } from '../controllers/storageController.js';

const router = express.Router();

router.post('/upload', upload);
router.get('/', (req, res) => {
    res.status(200).json({ message: 'Holaaa' });
});

export default router;
