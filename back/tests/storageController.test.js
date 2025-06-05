import { describe, it, expect, beforeEach, vi } from 'vitest';
import { upload, images, deleteImage, getImageDescription } from '../src/controllers/storageController.js';
import { uploadImageToContainer } from '../src/services/storageService.js';
import { readPool, writePool } from '../src/config/db.js';

vi.mock('../src/services/storageService.js', () => ({
    uploadImageToContainer: vi.fn()
}));

vi.mock('../src/config/db.js', () => ({
    readPool: {
        query: vi.fn()
    },
    writePool: {
        query: vi.fn(),
        getConnection: vi.fn()
    }
}));

vi.mock('../src/config/multerConfig.js', () => ({
    upload: {
        fields: vi.fn(() => (req, res, cb) => {
            // Simular el middleware de multer exitoso
            setImmediate(() => cb(null));
            return cb;
        })
    }
}));

vi.mock('../src/config/index.js', () => ({
    description_ia_url: 'http://localhost:5000',
    ipAddress: '127.0.0.1'
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('StorageController Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            files: {},
            body: {},
            query: {}
        };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
        vi.clearAllMocks();
    });

    // Test 9: Listar imágenes
    describe('images', () => {
        it('should fetch all images successfully', async () => {
            const mockImages = [
                { image_id: '1', path: '/path/1', user_id: 'user-1' },
                { image_id: '2', path: '/path/2', user_id: 'user-2' }
            ];

            readPool.query.mockResolvedValue([mockImages]);

            await images(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockImages);
        });
    });

    // Test 10: Eliminar imagen
    describe('deleteImage', () => {
        it('should delete image successfully', async () => {
            req.query = { imageId: 'image-123' };

            const mockImage = {
                image_id: 'image-123',
                path: 'http://localhost:3001/image/image-123'
            };

            readPool.query.mockResolvedValue([[mockImage]]);

            // Mock connection for transaction
            const mockConnection = {
                beginTransaction: vi.fn().mockResolvedValue(),
                query: vi.fn().mockResolvedValue([]),
                commit: vi.fn().mockResolvedValue(),
                rollback: vi.fn().mockResolvedValue(),
                release: vi.fn()
            };

            writePool.getConnection.mockResolvedValue(mockConnection);

            // Mock fetch for container deletion
            fetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });

            await deleteImage(req, res);

            expect(mockConnection.beginTransaction).toHaveBeenCalled();
            expect(mockConnection.commit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Image deleted successfully' });
        });

        // Test extra: Error al eliminar imagen inexistente
        it('should return error when image not found', async () => {
            req.query = { imageId: 'nonexistent-image' };

            readPool.query.mockResolvedValue([[]]);

            await deleteImage(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: 'Image not found in database' });
        });
    });
});