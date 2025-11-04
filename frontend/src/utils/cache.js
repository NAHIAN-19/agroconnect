/**
 * LRU (Least Recently Used) Cache Implementation
 * O(1) time complexity for get and put operations
 */
class LRUCache {
  constructor(capacity = 100) {
    this.capacity = capacity;
    this.cache = new Map(); // Hash map for O(1) access
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      // Update existing and move to end
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Expose cache for direct access if needed
  getCache() {
    return this.cache;
  }
}

// Singleton cache instances for different use cases
export const apiCache = new LRUCache(50); // Cache API responses
export const searchCache = new LRUCache(100); // Cache search results
export const filterCache = new LRUCache(50); // Cache filtered results

/**
 * Generate cache key from object
 */
export const generateCacheKey = (prefix, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}_${sortedParams}`;
};

