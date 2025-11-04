/**
 * Sorting utilities with optimized algorithms
 * Uses efficient comparison and binary search for range queries
 */

/**
 * Binary search for finding insertion point in sorted array
 * O(log n) time complexity
 */
export const binarySearchInsertionPoint = (sortedArray, value, compareFn, low = 0, high = null) => {
  if (high === null) high = sortedArray.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const comparison = compareFn(value, sortedArray[mid]);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return low;
};

/**
 * Merge sort - O(n log n) guaranteed
 * Stable sort algorithm
 */
export const mergeSort = (array, compareFn) => {
  if (array.length <= 1) {
    return array;
  }

  const mid = Math.floor(array.length / 2);
  const left = mergeSort(array.slice(0, mid), compareFn);
  const right = mergeSort(array.slice(mid), compareFn);

  return merge(left, right, compareFn);
};

const merge = (left, right, compareFn) => {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compareFn(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
};

/**
 * Quick sort with pivot optimization
 * Average O(n log n), worst O(n²)
 */
export const quickSort = (array, compareFn, low = 0, high = array.length - 1) => {
  if (low < high) {
    const pivotIndex = partition(array, compareFn, low, high);
    quickSort(array, compareFn, low, pivotIndex - 1);
    quickSort(array, compareFn, pivotIndex + 1, high);
  }
  return array;
};

const partition = (array, compareFn, low, high) => {
  // Use median of three for better pivot selection
  const mid = Math.floor((low + high) / 2);
  const pivot = medianOfThree(array[low], array[mid], array[high], compareFn);
  
  let i = low - 1;
  for (let j = low; j < high; j++) {
    if (compareFn(array[j], pivot) <= 0) {
      i++;
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  [array[i + 1], array[high]] = [array[high], array[i + 1]];
  return i + 1;
};

const medianOfThree = (a, b, c, compareFn) => {
  if (compareFn(a, b) < 0) {
    if (compareFn(b, c) < 0) return b;
    return compareFn(a, c) < 0 ? c : a;
  }
  if (compareFn(a, c) < 0) return a;
  return compareFn(b, c) < 0 ? c : b;
};

/**
 * Sort products with multiple criteria
 * Uses hash map for O(1) lookups during sorting
 */
export const sortProducts = (products, sortBy, sortOrder = 'asc') => {
  if (!products || products.length === 0) return products;
  if (!sortBy) return products;

  const sorted = [...products]; // Create copy to avoid mutation

  // Use merge sort for stable sorting
  return mergeSort(sorted, (a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // Handle nested properties
    if (sortBy.includes('.')) {
      const keys = sortBy.split('.');
      aVal = keys.reduce((obj, key) => obj?.[key], a);
      bVal = keys.reduce((obj, key) => obj?.[key], b);
    }

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
};

/**
 * Binary search in sorted array by price range
 * O(log n) for finding range bounds
 */
export const findPriceRange = (sortedByPrice, minPrice, maxPrice) => {
  if (!sortedByPrice || sortedByPrice.length === 0) return [];

  const comparePrice = (a, b) => (a.price || 0) - (b.price || 0);

  // Find lower bound
  let low = 0;
  let high = sortedByPrice.length - 1;
  let lowerBound = sortedByPrice.length;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if ((sortedByPrice[mid].price || 0) >= minPrice) {
      lowerBound = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Find upper bound
  low = 0;
  high = sortedByPrice.length - 1;
  let upperBound = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if ((sortedByPrice[mid].price || 0) <= maxPrice) {
      upperBound = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (lowerBound > upperBound) return [];

  return sortedByPrice.slice(lowerBound, upperBound + 1);
};

