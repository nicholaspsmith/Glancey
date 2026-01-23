import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, DEFAULT_RATE_LIMITER_CONFIG } from '../../embeddings/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const limiter = new RateLimiter();
      expect(limiter.getAvailableTokens()).toBe(DEFAULT_RATE_LIMITER_CONFIG.burstCapacity);
    });

    it('should use provided config', () => {
      const limiter = new RateLimiter({
        requestsPerSecond: 10,
        burstCapacity: 20,
      });
      expect(limiter.getAvailableTokens()).toBe(20);
    });

    it('should use partial config with defaults', () => {
      const limiter = new RateLimiter({
        requestsPerSecond: 2,
      });
      expect(limiter.getAvailableTokens()).toBe(DEFAULT_RATE_LIMITER_CONFIG.burstCapacity);
    });
  });

  describe('tryAcquire', () => {
    it('should acquire token when available', () => {
      const limiter = new RateLimiter({ requestsPerSecond: 5, burstCapacity: 10 });
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(9);
    });

    it('should fail when no tokens available', () => {
      const limiter = new RateLimiter({ requestsPerSecond: 5, burstCapacity: 2 });
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should refill tokens over time', () => {
      const limiter = new RateLimiter({ requestsPerSecond: 10, burstCapacity: 5 });

      // Use all tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryAcquire();
      }
      expect(limiter.getAvailableTokens()).toBe(0);

      // Advance time by 500ms - should add 5 tokens
      vi.advanceTimersByTime(500);
      expect(limiter.getAvailableTokens()).toBe(5);
    });

    it('should not exceed burst capacity when refilling', () => {
      const limiter = new RateLimiter({ requestsPerSecond: 10, burstCapacity: 5 });

      // Advance time significantly
      vi.advanceTimersByTime(5000);

      // Should still be capped at burst capacity
      expect(limiter.getAvailableTokens()).toBe(5);
    });
  });

  describe('acquire', () => {
    it('should resolve immediately when tokens available', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 5, burstCapacity: 10 });
      const promise = limiter.acquire();
      await expect(promise).resolves.toBeUndefined();
      expect(limiter.getAvailableTokens()).toBe(9);
    });

    it('should wait when no tokens available', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 2, burstCapacity: 1 });

      // Use the only token
      await limiter.acquire();
      expect(limiter.getAvailableTokens()).toBe(0);

      // Start acquiring another token
      let resolved = false;
      const promise = limiter.acquire().then(() => {
        resolved = true;
      });

      // Should not be resolved yet
      expect(resolved).toBe(false);

      // Advance time by 500ms (should add 1 token at 2 RPS)
      // Use async version to properly handle promise resolution
      await vi.advanceTimersByTimeAsync(500);

      expect(resolved).toBe(true);
      await promise;
    });

    it('should process multiple waiting requests in order', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 1, burstCapacity: 1 });

      // Use the only token
      await limiter.acquire();

      const order: number[] = [];

      // Queue up multiple requests
      const p1 = limiter.acquire().then(() => order.push(1));
      const p2 = limiter.acquire().then(() => order.push(2));

      expect(limiter.getQueueLength()).toBe(2);

      // Advance time to process both requests
      // Use async version to properly handle promise resolution
      await vi.advanceTimersByTimeAsync(2000);

      await Promise.all([p1, p2]);
      expect(order).toEqual([1, 2]);
    });
  });

  describe('getQueueLength', () => {
    it('should return 0 when no pending requests', () => {
      const limiter = new RateLimiter();
      expect(limiter.getQueueLength()).toBe(0);
    });

    it('should return correct queue length when requests are pending', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 1, burstCapacity: 1 });

      // Use the only token
      await limiter.acquire();

      // Queue up requests without awaiting
      limiter.acquire();
      limiter.acquire();

      expect(limiter.getQueueLength()).toBe(2);
    });
  });

  describe('reset', () => {
    it('should reset tokens to burst capacity', () => {
      const limiter = new RateLimiter({ requestsPerSecond: 5, burstCapacity: 10 });

      // Use some tokens
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();
      expect(limiter.getAvailableTokens()).toBe(7);

      // Reset
      limiter.reset();
      expect(limiter.getAvailableTokens()).toBe(10);
    });

    it('should resolve pending requests', async () => {
      const limiter = new RateLimiter({ requestsPerSecond: 1, burstCapacity: 1 });

      // Use the only token
      await limiter.acquire();

      // Queue up a request
      let resolved = false;
      const promise = limiter.acquire().then(() => {
        resolved = true;
      });

      expect(limiter.getQueueLength()).toBe(1);

      // Reset should resolve pending requests
      limiter.reset();
      // Allow microtask queue to flush
      await vi.advanceTimersByTimeAsync(0);

      expect(resolved).toBe(true);
      expect(limiter.getQueueLength()).toBe(0);
      await promise;
    });
  });

  describe('integration', () => {
    it('should rate limit concurrent requests', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const limiter = new RateLimiter({ requestsPerSecond: 100, burstCapacity: 5 });

      const start = Date.now();
      const requests: Promise<void>[] = [];

      // Make 10 requests (5 immediate, 5 rate limited)
      for (let i = 0; i < 10; i++) {
        requests.push(limiter.acquire());
      }

      await Promise.all(requests);
      const elapsed = Date.now() - start;

      // First 5 should be immediate, next 5 should take ~50ms at 100 RPS
      // Allow some tolerance for timing
      expect(elapsed).toBeGreaterThanOrEqual(40);
      expect(elapsed).toBeLessThan(200);
    });
  });
});
