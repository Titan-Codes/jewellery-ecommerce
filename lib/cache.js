/**
 * In-memory cache with TTL (Time To Live)
 * Production-ready caching solution for API responses
 */

class Cache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 100; // Maximum number of cache entries
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    }

    /**
     * Set a value in cache with TTL
     */
    set(key, value, ttl = this.defaultTTL) {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const expiresAt = Date.now() + ttl;
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * Get a value from cache (returns null if expired or not found)
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a specific key
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * Delete all keys matching a prefix
     */
    deleteByPrefix(prefix) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create singleton instance
const cache = new Cache();

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        cache.cleanup();
    }, 10 * 60 * 1000);
}

export default cache;
