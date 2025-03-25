import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import upload, { SPACE_STORAGE as spaceStorage } from './config/storage.js';

const app = express();

app.use(cors({
    origin: '*', // Allow requests from any origin (including all ports)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads/images');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Get available storage
app.get('/get-available-storage', (req, res) => {
    try {
        // Calculate used storage
        let usedStorage = 0;
        const files = fs.readdirSync(uploadsDir);
        
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            usedStorage += stats.size;
        });
        
        const availableStorage = spaceStorage - usedStorage;
        
        res.json({
            totalStorage: spaceStorage,
            usedStorage,
            availableStorage
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload image
app.post('/upload', (req, res) => {
    // Use the upload middleware with a single file field named 'image'
    upload.single('image')(req, res, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        // Return success response with file information
        res.status(201).json({
            message: 'Image uploaded successfully',
            image: {
                id: req.body.id_image || path.basename(req.file.filename, path.extname(req.file.filename)),
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            }
        });
    });
});

// Get all images
app.get('/images', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const images = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            const extension = path.extname(file);
            const id = path.basename(file, extension);
            
            return {
                id,
                filename: file,
                size: stats.size,
                uploadDate: stats.mtime
            };
        });
        
        res.json({ images });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download image by ID
app.get('/download/:idimage', (req, res) => {
    try {
        const { idimage } = req.params;
        const files = fs.readdirSync(uploadsDir);
        
        // Find the file that starts with the provided ID
        const targetFile = files.find(file => file.startsWith(idimage));
        
        if (!targetFile) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        const filePath = path.join(uploadsDir, targetFile);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete image by ID
app.delete('/delete/:idimage', (req, res) => {
    try {
        const { idimage } = req.params;
        const files = fs.readdirSync(uploadsDir);
        
        // Find the file that starts with the provided ID
        const targetFile = files.find(file => file.startsWith(idimage));
        
        if (!targetFile) {
            return res.status(404).json({ error: 'Image not found' });
        }
        
        const filePath = path.join(uploadsDir, targetFile);
        fs.unlinkSync(filePath);
        
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default app;