import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadImage, getImageById, isStorageHealthy } from '../src/services/storageService.js';

// Mock fetch globally
global.fetch = vi.fn();
global.FormData = class FormData {
    constructor() {
        this.data = {};
    }
    append(key, value) {
        this.data[key] = value;
    }
    entries() {
        return Object.entries(this.data);
    }
};
global.Blob = class Blob {
    constructor(chunks, options) {
        this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
        this.type = options?.type || '';
    }
};

// Mock fs operations
vi.mock('fs', () => ({
    default: {
        mkdtempSync: vi.fn(() => '/tmp/test-dir'),
        writeFileSync: vi.fn(),
        unlinkSync: vi.fn(),
        rmdirSync: vi.fn(),
        existsSync: vi.fn(() => true)
    }
}));

vi.mock('formdata-node/file-from-path', () => ({
    fileFromPath: vi.fn(() => Promise.resolve('mock-file'))
}));

describe('StorageService Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('isStorageHealthy', () => {
        it('should return true when storage is healthy', async () => {
            fetch.mockResolvedValue({
                ok: true
            });

            const result = await isStorageHealthy();

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/health'),
                expect.objectContaining({ method: 'GET' })
            );
        });

        it('should return false when storage is unhealthy', async () => {
            fetch.mockResolvedValue({
                ok: false
            });

            const result = await isStorageHealthy();

            expect(result).toBe(false);
        });
    });
});