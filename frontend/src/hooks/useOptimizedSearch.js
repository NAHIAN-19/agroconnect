import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fuzzySearch } from '../utils/search';
import { searchCache, generateCacheKey } from '../utils/cache';

/**
 * Optimized search hook with caching and memoization
 */
export const useOptimizedSearch = (products, debounceDelay = 300) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const productsArray = useMemo(() => Array.isArray(products) ? products : [], [products]);
  const [searchResults, setSearchResults] = useState(productsArray);
  const productsRef = useRef(null);

  // Memoized search function
  const performSearch = useCallback((query) => {
    const safeProducts = productsArray;
    
    if (!query || query.trim() === '' || safeProducts.length === 0) {
      return safeProducts;
    }

    // Check cache first
    const cacheKey = generateCacheKey('search', { query, productCount: safeProducts.length });
    const cached = searchCache.get(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }

    // Use fuzzy search
    let results = [];
    try {
      results = fuzzySearch(safeProducts, query);
      if (!Array.isArray(results)) {
        results = [];
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to simple filter
      const queryLower = query.toLowerCase();
      results = safeProducts.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(queryLower) || desc.includes(queryLower);
      });
    }

    // Cache the results
    if (results.length > 0 || query.trim() !== '') {
      searchCache.put(cacheKey, results);
    }

    return results;
  }, [productsArray]);

  // Update results when products change (without search query)
  useEffect(() => {
    // Only update if products changed and no active search
    if (productsRef.current !== products && (!debouncedQuery || !debouncedQuery.trim())) {
      productsRef.current = products;
      setSearchResults(productsArray);
    } else if (productsArray.length === 0) {
      setSearchResults([]);
    }
  }, [products, debouncedQuery, productsArray]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceDelay]);

  // Update results when debounced query changes
  useEffect(() => {
    // If no search query, return all products
    if (!debouncedQuery || debouncedQuery.trim() === '') {
      setSearchResults(productsArray);
      return;
    }

    // Perform search
    try {
      const results = performSearch(debouncedQuery);
      setSearchResults(Array.isArray(results) ? results : productsArray);
    } catch (error) {
      console.error('Error in search effect:', error);
      setSearchResults(productsArray);
    }
  }, [debouncedQuery, performSearch, productsArray]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    performSearch,
  };
};
