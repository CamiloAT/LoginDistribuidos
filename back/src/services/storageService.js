import { ip_container_1, ip_container_2, ip_container_3 } from "../config/index.js";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { FormData } from 'formdata-node'; // Different package for better compatibility
import { fileFromPath } from 'formdata-node/file-from-path';

// Format container IPs correctly
const formatContainerIP = (ip) => {
  // If it's just a port number (e.g., 4001)
  if (/^\d+$/.test(ip)) {
    return `localhost:${ip}`;
  }
  return ip;
};

// Array of properly formatted container IPs
const containersIPs = [
  formatContainerIP(ip_container_1),
  formatContainerIP(ip_container_2),
  formatContainerIP(ip_container_3)
];

// Set timeout for fetch operations
const FETCH_TIMEOUT = 5000;

/**
 * Execute a fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Fetch available storage information from a specific container
 * @param {string} containerIP - IP address of the container
 * @returns {Promise<Object>} Storage information
 */
export const getContainerStorageInfo = async (containerIP) => {
  try {
    const response = await fetchWithTimeout(`http://${containerIP}/get-available-storage`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch storage info from ${containerIP}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      containerIP,
      ...data,
      available: true
    };
  } catch (error) {
    console.error(`Error fetching storage info from ${containerIP}:`, error.message);
    return {
      containerIP,
      error: error.message,
      available: false
    };
  }
};

/**
 * Fetch storage information from all containers
 * @returns {Promise<Array>} Array of container storage information
 */
export const getAllContainersStorageInfo = async () => {
  try {
    const storagePromises = containersIPs.map(ip => getContainerStorageInfo(ip));
    const results = await Promise.allSettled(storagePromises);
    
    const availableContainers = results
      .filter(result => result.status === 'fulfilled' && result.value.available)
      .map(result => result.value);
    
    return availableContainers;
  } catch (error) {
    console.error('Error fetching all container storage info:', error.message);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Get the container with the most available storage space
 * @returns {Promise<Object|null>} Container with the most available storage
 */
export const getMostAvailableStorageContainer = async () => {
  try {
    const containersInfo = await getAllContainersStorageInfo();
    
    if (containersInfo.length === 0) {
      console.warn('No containers available');
      return null;
    }
    
    // Sort containers by available storage (descending)
    containersInfo.sort((a, b) => b.availableStorage - a.availableStorage);
    
    return containersInfo[0];
  } catch (error) {
    console.error('Error finding container with most available storage:', error.message);
    return null;
  }
};

/**
 * Get the IP of the container with the most available storage
 * @returns {Promise<string|null>} IP address of the container with most available storage
 */
export const getBestContainerIP = async () => {
  try {
    const container = await getMostAvailableStorageContainer();
    if (container) {
      return container.containerIP;
    }
    
    // If no container is available, try direct connection to the first one
    console.warn(`No available containers, trying direct connection to ${containersIPs[0]}`);
    return containersIPs[0];
  } catch (error) {
    console.error('Error getting best container IP:', error.message);
    return containersIPs[0]; // Fallback to first container
  }
};

/**
 * Upload an image to the container with the most available storage
 * @param {Object} file - Multer file object
 * @param {string} imageId - ID for the image
 * @returns {Promise<Object>} Upload response from the container
 */
export const uploadImageToContainer = async (file, imageId) => {
  // Try direct, simplified approach first
  try {
    // Get best container
    const bestContainerIP = await getBestContainerIP();
    console.log(`Attempting direct upload to best container: ${bestContainerIP}`);

    // Create form data directly with the buffer
    const formData = new FormData();
    formData.append('id_image', imageId.toString());
    
    // Create a file from the buffer
    const fileBlob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('image', fileBlob, file.originalname);
    
    // Send request
    const response = await fetchWithTimeout(`http://${bestContainerIP}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Direct upload failed: ${errorText}`);
    }
    
    const data = await response.json();
    return {
      containerIP: bestContainerIP,
      ...data
    };
  } catch (directError) {
    console.warn(`Direct upload failed: ${directError.message}. Trying alternate method...`);
  }
  
  // Fall back to file-based upload approach
  for (const containerIP of containersIPs) {
    try {
      console.log(`Attempting file-based upload to container: ${containerIP}`);
      
      // Create a unique temporary file
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
      const tempFilePath = path.join(tempDir, `${Date.now()}-${file.originalname}`);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, file.buffer);
      
      // Use formdata-node package to create form data
      const formData = new FormData();
      formData.append('id_image', imageId.toString());
      formData.append('image', await fileFromPath(tempFilePath));
      
      // Send request
      const response = await fetchWithTimeout(`http://${containerIP}/upload`, {
        method: 'POST',
        body: formData
      });
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        console.warn('Error cleaning up temp files:', cleanupError);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      
      // Return the successful response
      const data = await response.json();
      return {
        containerIP,
        ...data
      };
    } catch (error) {
      console.error(`Error uploading to container ${containerIP}:`, error.message);
      
      // If this is the last container, throw the error
      if (containerIP === containersIPs[containersIPs.length - 1]) {
        throw new Error(`Failed to upload to any container: ${error.message}`);
      }
      
      // Otherwise try the next container
      console.log('Trying next container...');
    }
  }
  
  // This should never be reached as the loop will either return on success or throw on failure
  throw new Error('Failed to upload: unexpected error');
};