/**
 * Cloudinary upload utility - Frontend Only
 * Uploads images directly to Cloudinary without requiring backend API
 * 
 * Setup Instructions:
 * 1. Create an unsigned upload preset in Cloudinary Dashboard:
 *    - Go to Settings → Upload → Upload Presets
 *    - Create preset named: "agroconnect_unsigned"
 *    - Set Signing Mode: Unsigned
 *    - Set Folder: agroconnect
 *    - Format: Leave empty or set to a specific format (e.g., "jpg", "png", "webp")
 *      DO NOT use "auto" for Format - it's not valid
 *    - Quality: Can be set to "auto" for automatic optimization (optional)
 *    - Note: Transformation parameters (format, quality, etc.) must be set
 *      in the preset, not in the upload request for unsigned uploads
 * 
 * 2. Set environment variables:
 *    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    VITE_CLOUDINARY_UPLOAD_PRESET=agroconnect_unsigned (optional, defaults to 'agroconnect_unsigned')
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'agroconnect_unsigned';

/**
 * Upload image to Cloudinary (Frontend Only)
 * Uses unsigned upload preset for direct client-side uploads
 * 
 * @param {File} file - The image file to upload
 * @param {string} folder - The folder path in Cloudinary (default: 'agroconnect')
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadImage = async (file, folder = 'agroconnect') => {
  // Validate Cloudinary configuration
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your environment variables.'
    );
  }

  // Validate file type
  if (!file || !file.type) {
    throw new Error('Invalid file. Please select a valid image file.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (JPG, PNG, GIF, etc.)');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB. Please compress or resize the image.');
  }

  // Check for very small files (might be corrupted)
  const minSize = 100; // 100 bytes minimum
  if (file.size < minSize) {
    throw new Error('File appears to be corrupted or empty.');
  }

  try {
    // Cloudinary upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    // Create FormData with required fields for unsigned upload
    // Note: format, quality, and other transformation parameters must be set
    // in the upload preset in Cloudinary dashboard, not in the request
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    uploadFormData.append('folder', folder);

    // Upload to Cloudinary
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    // Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Upload failed with status ${response.status}`;
      
      // Provide helpful error messages
      if (response.status === 400) {
        throw new Error(`Invalid upload: ${errorMessage}. Please check your upload preset configuration.`);
      } else if (response.status === 401) {
        throw new Error('Upload authentication failed. Please check your Cloudinary upload preset.');
      } else if (response.status === 403) {
        throw new Error('Upload forbidden. Please check your Cloudinary upload preset permissions.');
      } else {
        throw new Error(`Upload failed: ${errorMessage}`);
      }
    }

    const data = await response.json();

    // Validate response
    if (!data.secure_url && !data.url) {
      throw new Error('Upload succeeded but no image URL was returned.');
    }

    // Return secure URL (prefer secure_url over url)
    return data.secure_url || data.url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);

    // Re-throw with user-friendly messages
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    // Re-throw our custom errors as-is
    if (error.message.includes('must be') || error.message.includes('Invalid') || error.message.includes('Upload')) {
      throw error;
    }

    // Generic error for unexpected issues
    throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}. Please try again.`);
  }
};
