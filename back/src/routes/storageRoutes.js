import express from 'express';
import { upload as uploadController  } from '../controllers/storageController.js';

const router = express.Router();

router.post('/upload', uploadController);

router.get('/', (req, res) => {
    res.status(200).json({ message: 'Holaaa' });
});

export default router;
