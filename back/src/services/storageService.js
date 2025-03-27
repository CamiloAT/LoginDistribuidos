import { ip_container_1, ip_container_2, ip_container_3 } from "../config/index.js"

const urlLocal = "http://localhost:"

// Array of all container IPs
const containersIPs = [ip_container_1, ip_container_2, ip_container_3];

/**
 * Fetch available storage information from a specific container
 * @param {string} containerIP - IP address of the container
 * @returns {Promise<Object>} Storage information
 */
export const getContainerStorageInfo = async (containerIP) => {
  try {
    const response = await fetch(`http://${containerIP}/get-available-storage`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch storage info from ${containerIP}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      containerIP,
      ...data
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
    
    return results
      .filter(result => result.status === 'fulfilled' && !result.value.error)
      .map(result => result.value);
  } catch (error) {
    console.error('Error fetching all container storage info:', error.message);
    throw error;
  }
};

/**
 * Get the container with the most available storage space
 * @returns {Promise<Object>} Container with the most available storage
 */
export const getMostAvailableStorageContainer = async () => {
  try {
    const containersInfo = await getAllContainersStorageInfo();
    
    if (containersInfo.length === 0) {
      throw new Error('No containers available');
    }
    
    // Sort containers by available storage (descending)
    containersInfo.sort((a, b) => b.availableStorage - a.availableStorage);
    
    return containersInfo[0];
  } catch (error) {
    console.error('Error finding container with most available storage:', error.message);
    throw error;
  }
};

/**
 * Get the IP of the container with the most available storage
 * @returns {Promise<string>} IP address of the container with most available storage
 */
export const getBestContainerIP = async () => {
  try {
    const container = await getMostAvailableStorageContainer();
    return container.containerIP;
  } catch (error) {
    console.error('Error getting best container IP:', error.message);
    // Fallback to first container if there's an error
    return ip_container_1;
  }
};

/**
 * Upload an image to the container with the most available storage
 * @param {File|Buffer|Stream} imageFile - The image file to upload
 * @param {string} [id_image] - Optional ID for the image
 * @returns {Promise<Object>} Upload response from the container
 */
export const uploadImage = async (imageFile, id_image) => {
    try {
      // Get the container with the most available storage
      const bestContainerIP = await getBestContainerIP();
      
      if (!bestContainerIP) {
        throw new Error('No available containers for upload');
      }
      
      // Create a FormData object
      const formData = new FormData();

      // Add id_image if provided
      if (id_image) {
        formData.append('id_image', id_image);
      }

      formData.append('image', imageFile);

      // Send the upload request to the best container
      const response = await fetch(`http://${bestContainerIP}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || response.statusText;
        } catch {
          errorMessage = errorText || response.statusText;
        }
        throw new Error(`Upload failed: ${errorMessage}`);
      }
      
      // Return the successful response data
      const data = await response.json();
      return {
        containerIP: bestContainerIP,
        ...data
      };
    } catch (error) {
      console.error('Error uploading image to best container:', error.message);
      throw error;
    }
  };

/**
 * Upload an image to the container with the most available storage
 * @param {Object} file - Multer file object
 * @param {string} imageId - ID for the image
 * @returns {Promise<Object>} Upload response from the container
 */
export const uploadImageToContainer = async (file, imageId) => {
  try {
    // Get the container with the most available storage
    const bestContainerIP = await getBestContainerIP();
    
    if (!bestContainerIP) {
      throw new Error('No available containers for upload');
    }
    
    // Create a FormData object
    const formData = new FormData();
    
    // Add id_image first - important for order
    formData.append('id_image', imageId);
    
    // Add the file data
    // Use a Blob for the file data if in browser environment
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('image', blob, file.originalname);
    
    // Send the upload request to the best container
    const response = await fetch(`http://${bestContainerIP}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }
    
    // Return the response from the container
    const data = await response.json();
    return {
      containerIP: bestContainerIP,
      ...data
    };
  } catch (error) {
    console.error('Error uploading to container:', error);
    throw error;
  }
};