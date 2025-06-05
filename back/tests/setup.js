import { vi } from 'vitest';

// Global mocks
global.fetch = vi.fn();
global.FormData = vi.fn();
global.Blob = vi.fn();

// Setup before each test
beforeEach(() => {
    vi.clearAllMocks();
});