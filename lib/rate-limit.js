// Simple in-memory rate limiting
const rateLimitMap = new Map();

export const configureRateLimit = (maxRequests = 10, windowMs = 10000) => {
  return {
    limit: async (req) => {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Clean up old entries
      if (rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, rateLimitMap.get(ip).filter(time => time > windowStart));
      }
      
      const requestTimes = rateLimitMap.get(ip) || [];
      
      if (requestTimes.length >= maxRequests) {
        return { success: false };
      }
      
      requestTimes.push(now);
      rateLimitMap.set(ip, requestTimes);
      
      return { success: true };
    }
  };
};

// Create rate limit instances
export const pdfRateLimit = configureRateLimit(10, 10000);
export const actionRateLimit = configureRateLimit(5, 60000);