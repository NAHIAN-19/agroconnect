/**
 * Service Worker for Background Image Uploads
 * Handles image uploads even if the user refreshes the page
 */

const CACHE_NAME = 'agroconnect-upload-v1';
const DB_NAME = 'agroconnect_uploads';
const DB_VERSION = 1;
const STORE_NAME = 'pending_uploads';

let db = null;

/**
 * Initialize IndexedDB in Service Worker
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
 * Get stored file from IndexedDB
 */
const getStoredFile = async (uploadId) => {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(uploadId);
    
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
    
    request.onerror = () => {
      reject(request.error);
    };
    
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * Remove file from IndexedDB after upload
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
    console.error('SW: Error removing stored file:', error);
  }
};

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(clients.claim());
  
  // Resume any pending uploads on activation
  resumePendingUploads();
});

/**
 * Resume pending uploads from IndexedDB
 */
const resumePendingUploads = async () => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const pendingUploads = request.result || [];
      console.log('SW: Resuming pending uploads:', pendingUploads.length);
      
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
        await performUpload(uploadData.uploadId, file, uploadData.folder, uploadData.metadata);
      }
    };
  } catch (error) {
    console.error('SW: Error resuming pending uploads:', error);
  }
};

/**
 * Perform the actual upload to Cloudinary
 */
const performUpload = async (uploadId, file, folder, metadata, cloudName, uploadPreset) => {
  try {
    console.log('SW: Starting upload', uploadId);
    
    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset || 'agroconnect_unsigned');
    formData.append('folder', folder || 'agroconnect');
    
    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    const imageUrl = data.secure_url || data.url;
    
    console.log('SW: Upload successful', uploadId, imageUrl);
    
    // Remove from IndexedDB
    await removeStoredFile(uploadId);
    
    // Notify all clients about the upload completion
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'UPLOAD_COMPLETE',
        uploadId,
        imageUrl,
        metadata,
        success: true,
      });
    });
    
    return imageUrl;
  } catch (error) {
    console.error('SW: Upload error', uploadId, error);
    
    // Remove from IndexedDB on error (or keep it for retry?)
    await removeStoredFile(uploadId);
    
    // Notify clients about the error
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'UPLOAD_COMPLETE',
        uploadId,
        error: error.message,
        metadata,
        success: false,
      });
    });
    
    throw error;
  }
};

// Message handler for background uploads
self.addEventListener('message', async (event) => {
  if (event.data.type === 'UPLOAD_IMAGE') {
    const { uploadId, folder, metadata, cloudName, uploadPreset } = event.data;
    
    // Get file from IndexedDB
    const storedData = await getStoredFile(uploadId);
    if (!storedData) {
      console.error('SW: File not found in IndexedDB for uploadId:', uploadId);
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'UPLOAD_COMPLETE',
          uploadId,
          error: 'File not found',
          success: false,
        });
      });
      return;
    }
    
    const { file } = storedData;
    
    // Perform the upload
    await performUpload(uploadId, file, folder, metadata, cloudName, uploadPreset);
  }
});
