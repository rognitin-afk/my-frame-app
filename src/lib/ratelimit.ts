import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
let _apiLimiter: Ratelimit | null = null;
let _adminLoginLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/**
 * General API: 120 requests per 60 seconds per IP.
 */
export function getApiRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!_apiLimiter) {
    _apiLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      analytics: true,
    });
  }
  return _apiLimiter;
}

/**
 * Admin login: 30 attempts per 15 minutes per IP.
 */
export function getAdminLoginRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!_adminLoginLimiter) {
    _adminLoginLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "15 m"),
      analytics: true,
    });
  }
  return _adminLoginLimiter;
}

export const isRateLimitEnabled = () => !!getRedis();
