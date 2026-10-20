import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  checkDistributedRateLimit,
  getClientIp,
  resetRateLimitStore,
} from "@/lib/rate-limit";

describe("Rate Limiting & Proxy IP Extraction (src/lib/rate-limit.ts)", () => {
  beforeEach(() => {
    resetRateLimitStore();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetRateLimitStore();
  });

  describe("In-Memory Sliding Window (checkRateLimit)", () => {
    it("permits requests within the defined threshold", () => {
      const res1 = checkRateLimit("user-test-1", 3, 10000);
      expect(res1.success).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = checkRateLimit("user-test-1", 3, 10000);
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = checkRateLimit("user-test-1", 3, 10000);
      expect(res3.success).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it("rejects requests exceeding the threshold", () => {
      checkRateLimit("user-test-2", 2, 10000);
      checkRateLimit("user-test-2", 2, 10000);

      const rejected = checkRateLimit("user-test-2", 2, 10000);
      expect(rejected.success).toBe(false);
      expect(rejected.remaining).toBe(0);
      expect(rejected.resetMs).toBeGreaterThan(0);
    });

    it("isolates counters between different keys", () => {
      checkRateLimit("key-a", 1, 10000);
      const resA = checkRateLimit("key-a", 1, 10000);
      expect(resA.success).toBe(false);

      const resB = checkRateLimit("key-b", 1, 10000);
      expect(resB.success).toBe(true);
    });
  });

  describe("IP Extraction & Anti-Spoofing (getClientIp)", () => {
    it("prioritizes x-real-ip set by trusted reverse proxy", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "x-real-ip": "102.89.23.4",
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });
      expect(getClientIp(req)).toBe("102.89.23.4");
    });

    it("reads x-vercel-forwarded-for when x-real-ip is absent", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "x-vercel-forwarded-for": "105.112.98.12",
        },
      });
      expect(getClientIp(req)).toBe("105.112.98.12");
    });

    it("reads cf-connecting-ip when behind Cloudflare", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "cf-connecting-ip": "197.210.84.55",
        },
      });
      expect(getClientIp(req)).toBe("197.210.84.55");
    });

    it("ignores malformed or injection-attempt IPs in headers", () => {
      const req = new Request("http://localhost/test", {
        headers: {
          "x-real-ip": "malicious-script<script>",
          "x-forwarded-for": "not-an-ip, 197.210.50.2",
        },
      });
      // Falls past invalid x-real-ip and first invalid x-forwarded-for to the first valid IP
      expect(getClientIp(req)).toBe("197.210.50.2");
    });

    it("falls back to 'unknown' when no valid IP header is provided", () => {
      const req = new Request("http://localhost/test");
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("Distributed Rate Limiting Adapter (checkDistributedRateLimit)", () => {
    it("falls back synchronously to in-memory store when Redis environment variables are not set", async () => {
      const res = await checkDistributedRateLimit("distributed-fallback", 5, 60000);
      expect(res.success).toBe(true);
      expect(res.limit).toBe(5);
      expect(res.remaining).toBe(4);
    });

    it("calls Upstash Redis REST endpoint when environment variables are configured", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token-abc";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { result: 1 }, // INCR count
          { result: "OK" }, // EXPIRE
          { result: 59 }, // TTL
        ],
      });
      global.fetch = mockFetch;

      const res = await checkDistributedRateLimit("test-user-dist", 10, 60000);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://mock-redis.upstash.io/pipeline",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token-abc",
          }),
        }),
      );
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(9);
    });
  });
});
