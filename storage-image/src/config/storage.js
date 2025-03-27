import multer from "multer";

export let SPACE_STORAGE = 100 * 1024 * 1024; // 100MB

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// Filter for image files only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed'), false)
    }
}

// Create and export multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
})

export default upload;
