/**
 * Trie data structure for efficient prefix-based search
 * O(m) time complexity where m is the length of the search string
 */
class TrieNode {
  constructor() {
    this.children = new Map(); // Hash map for O(1) child access
    this.isEndOfWord = false;
    this.products = []; // Store product IDs/indices
  }
}

class SearchTrie {
  constructor() {
    this.root = new TrieNode();
    this.productMap = new Map(); // O(1) product lookup by ID
  }

  /**
   * Insert a product into the trie
   * O(m) time where m is the length of the text
   */
  insert(product, searchableFields = ['name', 'description']) {
    const productId = product.id;
    this.productMap.set(productId, product);

    // Index all searchable fields
    searchableFields.forEach(field => {
      if (product[field]) {
        const words = product[field].toLowerCase().split(/\s+/);
        words.forEach(word => {
          this._insertWord(word, productId);
        });
      }
    });
  }

  _insertWord(word, productId) {
    let current = this.root;
    
    for (let char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char);
    }
    
    current.isEndOfWord = true;
    if (!current.products.includes(productId)) {
      current.products.push(productId);
    }
  }

  /**
   * Search for products matching the query
   * O(m + k) time where m is query length, k is number of results
   */
  search(query) {
    if (!query || query.trim() === '') {
      return Array.from(this.productMap.values());
    }

    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
    if (searchTerms.length === 0) {
      return Array.from(this.productMap.values());
    }

    // Find products matching all terms (AND logic)
    let matchingProductIds = null;

    for (const term of searchTerms) {
      const termMatches = this._searchTerm(term);
      
      if (termMatches.length === 0) {
        return []; // No matches for this term
      }

      if (matchingProductIds === null) {
        matchingProductIds = new Set(termMatches);
      } else {
        // Intersection of sets
        matchingProductIds = new Set(
          [...matchingProductIds].filter(id => termMatches.includes(id))
        );
      }

      if (matchingProductIds.size === 0) {
        return [];
      }
    }

    const result = Array.from(matchingProductIds).map(id => this.productMap.get(id)).filter(Boolean);
    return result.length > 0 ? result : [];
  }

  _searchTerm(term) {
    let current = this.root;
    const results = new Set();

    // Navigate through the trie
    for (let char of term) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char);
    }

    // Collect all products from this node and its descendants
    this._collectProducts(current, results);
    
    return Array.from(results);
  }

  _collectProducts(node, results) {
    if (node.isEndOfWord) {
      node.products.forEach(id => results.add(id));
    }

    for (const child of node.children.values()) {
      this._collectProducts(child, results);
    }
  }

  /**
   * Clear the trie
   */
  clear() {
    this.root = new TrieNode();
    this.productMap.clear();
  }

  /**
   * Rebuild trie with new products
   */
  rebuild(products, searchableFields = ['name', 'description']) {
    this.clear();
    products.forEach(product => {
      this.insert(product, searchableFields);
    });
  }
}

/**
 * Fast fuzzy search using multiple algorithms
 */
export const fuzzySearch = (products, query, fields = ['name', 'description']) => {
  if (!query || query.trim() === '') {
    return products;
  }

  const queryLower = query.toLowerCase().trim();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
  
  if (queryTerms.length === 0) {
    return products;
  }

  // Score-based matching for better relevance
  const scored = products.map(product => {
    let score = 0;
    let matches = 0;

    fields.forEach(field => {
      if (!product[field]) return;
      
      const fieldLower = product[field].toLowerCase();
      
      queryTerms.forEach(term => {
        // Exact match gets highest score
        if (fieldLower === term) {
          score += 10;
          matches++;
        }
        // Starts with gets high score
        else if (fieldLower.startsWith(term)) {
          score += 5;
          matches++;
        }
        // Contains gets medium score
        else if (fieldLower.includes(term)) {
          score += 2;
          matches++;
        }
      });
    });

    return { product, score, matches };
  });

  // Filter and sort by relevance
  return scored
    .filter(item => item.matches > 0)
    .sort((a, b) => {
      // Primary sort by matches, secondary by score
      if (b.matches !== a.matches) {
        return b.matches - a.matches;
      }
      return b.score - a.score;
    })
    .map(item => item.product);
};

/**
 * Binary search for sorted arrays
 * O(log n) time complexity
 */
export const binarySearch = (sortedArray, target, compareFn) => {
  let left = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const comparison = compareFn(sortedArray[mid], target);

    if (comparison === 0) {
      return mid;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
};

export default SearchTrie;

