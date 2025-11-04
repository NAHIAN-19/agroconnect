/**
 * Background upload service using Service Worker and IndexedDB
 * Handles image uploads even if user refreshes the page
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'agroconnect_unsigned';

const DB_NAME = 'agroconnect_uploads';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

let uploadIdCounter = 0;
let uploadCallbacks = new Map(); // Store callbacks for pending uploads
let messageListener = null;
let db = null;

/**
 * Initialize IndexedDB for storing upload files
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'uploadId' });
      }
    };
  });
};

/**
 * Store file in IndexedDB
 */
const storeFile = async (uploadId, file, folder, metadata = {}) => {
  const database = await initDB();
  
  // Convert file to ArrayBuffer first
  const fileData = await file.arrayBuffer();
  
  // Return a promise that resolves when the transaction completes
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put({
      uploadId,
      fileData,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folder,
      metadata,
      timestamp: Date.now(),
    });
    
    request.onsuccess = () => {
      resolve(uploadId);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
    
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * Remove file from IndexedDB after successful upload
 */
const removeStoredFile = async (uploadId) => {
  try {
    const database = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(uploadId);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(request.error);
      };
      
      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error removing stored file:', error);
  }
};

/**
 * Get stored file from IndexedDB
 */
const getStoredFile = async (uploadId) => {
  const database = await initDB();
  const transaction = database.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(uploadId);
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        // Convert ArrayBuffer back to File
        const file = new File([data.fileData], data.fileName, { type: data.fileType });
        resolve({ file, folder: data.folder, metadata: data.metadata });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Initialize the upload service
 * Registers service worker and sets up message listener
 */
export const initUploadService = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported');
    return false;
  }

  if (!('indexedDB' in window)) {
    console.warn('IndexedDB is not supported');
    return false;
  }

  try {
    // Initialize IndexedDB
    await initDB();
    
    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('Service Worker registered:', registration);
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Check for pending uploads and resume them
    await resumePendingUploads();
    
    // Set up message listener if not already set
    if (!messageListener) {
      messageListener = (event) => {
        if (event.data.type === 'UPLOAD_COMPLETE') {
          const { uploadId, imageUrl, error, success } = event.data;
          const callback = uploadCallbacks.get(uploadId);
          
          if (callback) {
            if (success) {
              callback.resolve(imageUrl);
              // Remove from IndexedDB
              removeStoredFile(uploadId);
            } else {
              callback.reject(new Error(error || 'Upload failed'));
              // Remove from IndexedDB on error
              removeStoredFile(uploadId);
            }
            uploadCallbacks.delete(uploadId);
          } else {
            // This might be a resumed upload, just clean up
            if (success) {
              removeStoredFile(uploadId);
            }
          }
        }
      };
      
      navigator.serviceWorker.addEventListener('message', messageListener);
    }
    
    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
};

/**
 * Resume any pending uploads from IndexedDB
 */
const resumePendingUploads = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const pendingUploads = request.result || [];
      console.log('Resuming pending uploads:', pendingUploads.length);
      
      for (const uploadData of pendingUploads) {
        // Check if upload is recent (within last hour)
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - uploadData.timestamp > oneHour) {
          // Too old, remove it
          await removeStoredFile(uploadData.uploadId);
          continue;
        }
        
        // Resume the upload
        const file = new File([uploadData.fileData], uploadData.fileName, { type: uploadData.fileType });
        await startServiceWorkerUpload(uploadData.uploadId, file, uploadData.folder, uploadData.metadata);
      }
    };
  } catch (error) {
    console.error('Error resuming pending uploads:', error);
  }
};

/**
 * Start upload via service worker
 */
const startServiceWorkerUpload = async (uploadId, file, folder, metadata = {}) => {
  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({
      type: 'UPLOAD_IMAGE',
      uploadId,
      folder,
      metadata,
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    });
  } else {
    // Send upload message to service worker
    controller.postMessage({
      type: 'UPLOAD_IMAGE',
      uploadId,
      folder,
      metadata,
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    });
  }
};

/**
 * Upload image using service worker (background upload)
 * @param {File} file - The image file to upload
 * @param {string} folder - The folder path (default: 'agroconnect')
 * @param {object} metadata - Optional metadata to pass through
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadImageViaServiceWorker = async (file, folder = 'agroconnect', metadata = {}) => {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error(
      'Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your environment variables.'
    );
  }

  // Validate file
  if (!file || !file.type) {
    throw new Error('Invalid file. Please select a valid image file.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (JPG, PNG, GIF, etc.)');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB. Please compress or resize the image.');
  }

  const minSize = 100;
  if (file.size < minSize) {
    throw new Error('File appears to be corrupted or empty.');
  }

  // Ensure service worker is initialized
  const swReady = await initUploadService();
  if (!swReady) {
    // Fallback to direct upload if service worker fails
    console.warn('Service Worker not available, falling back to direct upload');
    const { uploadImage } = await import('./cloudinary');
    return uploadImage(file, folder);
  }

  // Generate unique upload ID
  const uploadId = `upload_${Date.now()}_${++uploadIdCounter}`;

  // Store file in IndexedDB so it survives page refresh
  await storeFile(uploadId, file, folder, metadata);

  // Create a promise that will be resolved/rejected when upload completes
  return new Promise((resolve, reject) => {
    // Store the callbacks
    uploadCallbacks.set(uploadId, { resolve, reject });

    // Start the upload via service worker
    startServiceWorkerUpload(uploadId, file, folder, metadata).catch((error) => {
      uploadCallbacks.delete(uploadId);
      removeStoredFile(uploadId);
      reject(error);
    });

    // Set a timeout for the upload (30 seconds)
    setTimeout(() => {
      if (uploadCallbacks.has(uploadId)) {
        uploadCallbacks.delete(uploadId);
        reject(new Error('Upload timeout. Please try again.'));
      }
    }, 30000);
  });
};

/**
 * Clean up upload callbacks (useful for memory management)
 */
export const cleanupUploadService = () => {
  uploadCallbacks.clear();
  if (messageListener) {
    navigator.serviceWorker.removeEventListener('message', messageListener);
    messageListener = null;
  }
};
