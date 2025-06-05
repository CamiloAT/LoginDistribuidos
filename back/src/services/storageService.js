import fs from 'fs';
import path from 'path';
import os from 'os';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

// Configuración del endpoint de Nginx Load Balancer
const NGINX_STORAGE_URL = process.env.NGINX_STORAGE_URL || 'http://nginx-storage-lb:80';

// Set timeout for fetch operations
const FETCH_TIMEOUT = 30000; // 30 segundos para uploads grandes

/**
 * Execute a fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {

    console.log("----------------------------------------");
    console.log(`Fetching URL: ${url} with options:`, options);
    console.log("----------------------------------------");

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

/**
 * Get storage information through the load balancer
 * @returns {Promise<Object>} Storage information
 */
export const getStorageInfo = async () => {
  try {
    console.log(`Fetching storage info from load balancer: ${NGINX_STORAGE_URL}`);

    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/get-available-storage`);

    if (!response.ok) {
      throw new Error(`Failed to fetch storage info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      loadBalancer: NGINX_STORAGE_URL,
      timestamp: new Date().toISOString(),
      ...data,
      available: true
    };
  } catch (error) {
    console.error(`Error fetching storage info:`, error.message);
    return {
      loadBalancer: NGINX_STORAGE_URL,
      error: error.message,
      available: false,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check if the storage service is healthy
 * @returns {Promise<boolean>} Health status
 */
export const isStorageHealthy = async () => {
  try {
    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Storage health check failed:', error.message);
    return false;
  }
};

/**
 * Upload an image through the load balancer
 * @param {Object} file - Multer file object
 * @param {string} imageId - ID for the image
 * @returns {Promise<Object>} Upload response
 */
export const uploadImage = async (file, imageId) => {
  if (!file || !file.buffer) {
    throw new Error('Invalid file object provided');
  }

  if (!imageId) {
    throw new Error('Image ID is required');
  }

  // Try direct approach with Blob first
  try {
    console.log(`Attempting direct upload through load balancer: ${NGINX_STORAGE_URL}`);
    console.log(`File info: ${file.originalname}, Size: ${file.buffer.length} bytes, Type: ${file.mimetype}`);

    // Create form data directly with the buffer
    const formData = new FormData();
    formData.append('id_image', imageId.toString());

    // Create a file from the buffer
    const fileBlob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
    formData.append('image', fileBlob, file.originalname || 'upload');

    // Send request through nginx load balancer
    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type manually, let FormData handle it
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Direct upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Direct upload successful:', data);

    return {
      loadBalancer: NGINX_STORAGE_URL,
      method: 'direct',
      uploadedAt: new Date().toISOString(),
      ...data
    };
  } catch (directError) {
    console.warn(`Direct upload failed: ${directError.message}. Trying file-based method...`);
  }

  // Fall back to file-based upload approach
  let tempDir = null;
  let tempFilePath = null;

  try {
    console.log(`Attempting file-based upload through load balancer: ${NGINX_STORAGE_URL}`);

    // Create a unique temporary file
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-upload-'));
    tempFilePath = path.join(tempDir, `${Date.now()}-${imageId}-${file.originalname || 'upload'}`);

    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, file.buffer);

    // Use formdata-node package to create form data
    const formData = new FormData();
    formData.append('id_image', imageId.toString());
    formData.append('image', await fileFromPath(tempFilePath));

    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    // Send request through nginx load balancer
    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/upload`, {
      method: 'POST',
      body: formData
    });


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`File-based upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Return the successful response
    const data = await response.json();
    console.log('File-based upload successful:', data);

    return {
      loadBalancer: NGINX_STORAGE_URL,
      method: 'file-based',
      uploadedAt: new Date().toISOString(),
      ...data
    };
  } catch (error) {
    console.error(`Error uploading through load balancer:`, error.message);
    throw new Error(`Failed to upload through load balancer: ${error.message}`);
  } finally {
    // Clean up the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('Error removing temp file:', cleanupError.message);
      }
    }

    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        console.warn('Error removing temp directory:', cleanupError.message);
      }
    }
  }
};

/**
 * Get image by ID through the load balancer
 * @param {string} imageId - ID of the image to retrieve
 * @returns {Promise<Response>} Image response
 */
export const getImageById = async (imageId) => {
  if (!imageId) {
    throw new Error('Image ID is required');
  }

  try {
    console.log(`Fetching image with ID ${imageId} through load balancer: ${NGINX_STORAGE_URL}`);

    // Make request through the load balancer
    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/image/${imageId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Image with ID ${imageId} not found`);
      }
      const errorText = await response.text();
      throw new Error(`Failed to get image: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error(`Error fetching image through load balancer:`, error.message);
    throw error;
  }
};

/**
 * Delete image by ID through the load balancer (if supported by your storage service)
 * @param {string} imageId - ID of the image to delete
 * @returns {Promise<Object>} Delete response
 */
export const deleteImageById = async (imageId) => {
  if (!imageId) {
    throw new Error('Image ID is required');
  }

  try {
    console.log(`Deleting image with ID ${imageId} through load balancer: ${NGINX_STORAGE_URL}`);

    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/image/${imageId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Image with ID ${imageId} not found`);
      }
      const errorText = await response.text();
      throw new Error(`Failed to delete image: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return {
      loadBalancer: NGINX_STORAGE_URL,
      deletedAt: new Date().toISOString(),
      ...data
    };
  } catch (error) {
    console.error(`Error deleting image through load balancer:`, error.message);
    throw error;
  }
};

/**
 * Get load balancer status and upstream servers info
 * @returns {Promise<Object>} Load balancer status
 */
export const getLoadBalancerStatus = async () => {
  try {
    const response = await fetchWithTimeout(`${NGINX_STORAGE_URL}/nginx_status`);

    if (!response.ok) {
      throw new Error(`Failed to get load balancer status: ${response.statusText}`);
    }

    const statusText = await response.text();
    return {
      loadBalancer: NGINX_STORAGE_URL,
      status: statusText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting load balancer status:', error.message);
    return {
      loadBalancer: NGINX_STORAGE_URL,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Legacy function names for backward compatibility (if needed)
export const uploadImageToContainer = uploadImage;
export const getImageByIdForContainer = (imageId) => getImageById(imageId);