// lib/storage.js
// Detta ersätter .cache-mappen som inte fungerar på Vercel

const memoryCache = new Map();

export const storage = {
  async get(key) {
    // Enkel in-memory cache
    return memoryCache.get(key);
  },

  async set(key, value, ttlSeconds = 3600) {
    // Spara i minnet
    memoryCache.set(key, value);
    
    // Ta bort automatiskt efter TTL
    if (ttlSeconds > 0) {
      setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
    }
  },

  async delete(key) {
    memoryCache.delete(key);
  }
};