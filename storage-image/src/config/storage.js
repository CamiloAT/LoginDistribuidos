import multer from "multer";

export let SPACE_STORAGE = 100 * 1024 * 1024; // 100MB

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/images')
    },
    filename: function (req, file, cb) {
        // Use idimage from form data if available
        let idimage = '';
        
        // Check if the idimage exists in the request body
        if (req.body && req.body.idimage) {
            idimage = req.body.idimage;
        } else {
            // Fallback to a unique ID if idimage is not available
            idimage = Date.now() + '-' + Math.round(Math.random() * 1E9);
        }
        
        const extension = file.originalname.split('.').pop();
        cb(null, `${idimage}.${extension}`);
    }
})

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