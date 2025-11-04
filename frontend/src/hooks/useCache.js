import { useCallback, useRef } from 'react';
import { apiCache, generateCacheKey } from '../utils/cache';
import api from '../api';

/**
 * Hook for cached API requests
 * Implements LRU caching to reduce network calls
 */
export const useCache = () => {
  const pendingRequests = useRef(new Map()); // Prevent duplicate requests

  const getCached = useCallback(async (url, params = {}, options = {}) => {
    const cacheKey = generateCacheKey(url, params);
    const cacheTTL = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default

    // Check cache first
    const cached = apiCache.get(cacheKey);
    if (cached) {
      const { data, timestamp } = cached;
      // Check if cache is still valid
      if (Date.now() - timestamp < cacheTTL) {
        return data;
      }
      // Cache expired, remove it
      apiCache.getCache().delete(cacheKey);
    }

    // Check if request is already pending
    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey);
    }

    // Make API request
    const requestPromise = api.get(url, { params })
      .then(response => {
        const data = response.data;
        
        // Cache the response
        apiCache.put(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        pendingRequests.current.delete(cacheKey);
        return data;
      })
      .catch(error => {
        pendingRequests.current.delete(cacheKey);
        throw error;
      });

    pendingRequests.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  const invalidateCache = useCallback((url, params = {}) => {
    const cacheKey = generateCacheKey(url, params);
    if (apiCache.has(cacheKey)) {
      apiCache.getCache().delete(cacheKey);
    }
  }, []);

  const clearCache = useCallback(() => {
    apiCache.clear();
    pendingRequests.current.clear();
  }, []);

  return {
    getCached,
    invalidateCache,
    clearCache,
  };
};

