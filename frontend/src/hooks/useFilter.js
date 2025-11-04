import { useMemo } from 'react';
import { filterCache, generateCacheKey } from '../utils/cache';
import { sortProducts, findPriceRange } from '../utils/sort';

/**
 * Optimized filter hook with memoization and caching
 * Uses hash maps for O(1) lookups and binary search for price ranges
 */
export const useFilter = (items, filterCriteria) => {
  // Memoize filtered results
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return items;
    if (!filterCriteria || Object.keys(filterCriteria).length === 0) {
      return items;
    }

    // Check cache
    const cacheKey = generateCacheKey('filter', {
      ...filterCriteria,
      itemCount: items.length,
    });
    const cached = filterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create hash maps for O(1) category/status lookups
    const categoryMap = new Map();
    const statusMap = new Map();
    const inStockMap = new Map();

    items.forEach(item => {
      // Category hash map
      const category = item.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category).push(item);

      // Status hash map
      if (item.status) {
        if (!statusMap.has(item.status)) {
          statusMap.set(item.status, []);
        }
        statusMap.get(item.status).push(item);
      }

      // Stock status hash map
      const stockStatus = (item.stock || 0) > 0 ? 'in_stock' : 'out_of_stock';
      if (!inStockMap.has(stockStatus)) {
        inStockMap.set(stockStatus, []);
      }
      inStockMap.get(stockStatus).push(item);
    });

    let result = items;

    // Apply category filter using hash map (O(1) lookup)
    if (filterCriteria.category && filterCriteria.category !== 'all') {
      if (categoryMap.has(filterCriteria.category)) {
        const categoryItems = new Set(categoryMap.get(filterCriteria.category));
        result = result.filter(item => categoryItems.has(item));
      } else {
        // Category doesn't exist, return empty
        filterCache.put(cacheKey, []);
        return [];
      }
    }

    // Apply stock filter using hash map
    if (filterCriteria.inStock !== undefined) {
      const stockKey = filterCriteria.inStock ? 'in_stock' : 'out_of_stock';
      if (inStockMap.has(stockKey)) {
        const stockItems = new Set(inStockMap.get(stockKey));
        result = result.filter(item => stockItems.has(item));
      }
    }

    // Apply status filter using hash map
    if (filterCriteria.status && statusMap.has(filterCriteria.status)) {
      const statusItems = new Set(statusMap.get(filterCriteria.status));
      result = result.filter(item => statusItems.has(item));
    }

    // Apply price range filter - use binary search if sorted by price
    if (filterCriteria.minPrice !== undefined || filterCriteria.maxPrice !== undefined) {
      const minPrice = filterCriteria.minPrice ?? 0;
      const maxPrice = filterCriteria.maxPrice ?? Infinity;

      // If items are already sorted by price and we have full range, use binary search
      if (filterCriteria.sortBy === 'price' && filterCriteria.sortOrder) {
        const sorted = sortProducts(result, 'price', filterCriteria.sortOrder);
        result = findPriceRange(sorted, minPrice, maxPrice);
      } else {
        // Otherwise, use linear filter
        result = result.filter(item => {
          const price = item.price || 0;
          return price >= minPrice && price <= maxPrice;
        });
      }
    }

    // Sort using optimized algorithm
    if (filterCriteria.sortBy) {
      result = sortProducts(result, filterCriteria.sortBy, filterCriteria.sortOrder || 'asc');
    }

    // Cache the result
    filterCache.put(cacheKey, result);

    return result;
  }, [items, filterCriteria]);

  return filteredItems;
};

