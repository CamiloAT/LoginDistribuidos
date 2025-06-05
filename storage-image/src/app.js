import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import upload, { SPACE_STORAGE as spaceStorage } from './config/storage.js';
import { hostname, portContainer } from './config/index.js';

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

const cpUpload = upload.fields([
    { name: 'id_image', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

// Upload image
app.post('/upload', (req, res) => {
    cpUpload(req, res, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        console.log("haoooodasdñlj", hostname)

        // Check if image file was provided
        if (!req.files || !req.files.image || !req.files.image[0]) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get the image file from memory
        const imageFile = req.files.image[0];

        // Generate ID for the image
        const idImage = req.body.id_image || Date.now() + '-' + Math.round(Math.random() * 1E9);

        // Determine file extension
        const extension = imageFile.originalname.split('.').pop();
        const fileName = `${idImage}.${extension}`;
        const filePath = path.join(uploadsDir, fileName);

        // Write the file to disk
        fs.writeFile(filePath, imageFile.buffer, (err) => {
            if (err) {
                console.error('Error saving file:', err);
                return res.status(500).json({ error: 'Error saving file' });
            }

            res.status(201).json({
                message: 'Image uploaded successfully',
                image: {
                    id: idImage,
                    filename: fileName,
                    originalName: imageFile.originalname,
                    mimetype: imageFile.mimetype,
                    size: imageFile.size,
                    path: filePath,
                    servedByContainer: hostname,
                    portByContainer: portContainer,
                }
            });
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

// Get image by ID
app.get('/image/:idimage', (req, res) => {
    try {
        const { idimage } = req.params;
        const files = fs.readdirSync(uploadsDir);

        // Find the file that starts with the provided ID
        const targetFile = files.find(file => file.startsWith(idimage));

        if (!targetFile) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Construct full path ensuring we use uploads/images directory
        const filePath = path.join(uploadsDir, targetFile);

        // Verify file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image file not found on server' });
        }

        // Determine the content type based on file extension
        const extension = path.extname(targetFile).toLowerCase();
        let contentType = 'application/octet-stream'; // default

        switch (extension) {
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.webp':
                contentType = 'image/webp';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
        }

        // Set content type header
        res.setHeader('Content-Type', contentType);

        // Stream the file to the response
        const stream = fs.createReadStream(filePath);
        stream.on('error', (err) => {
            console.error('Error streaming file:', err);
            res.status(500).json({ error: 'Error reading image file' });
        });
        stream.pipe(res);
    } catch (error) {
        console.error('Error retrieving image:', error);
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