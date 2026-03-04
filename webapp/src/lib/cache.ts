/**
 * Simple in-memory cache for data fetching
 * Uses Map for key-value storage with TTL support
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl?: number; // Time to live in milliseconds
}

class Cache {
	private cache = new Map<string, CacheEntry<unknown>>();

	/**
	 * Get value from cache
	 * @param key Cache key
	 * @returns Cached value or null if not found or expired
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		// Check if entry has expired
		if (entry.ttl) {
			const now = Date.now();
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
				return null;
			}
		}

		return entry.data as T;
	}

	/**
	 * Set value in cache
	 * @param key Cache key
	 * @param data Data to cache
	 * @param ttl Time to live in milliseconds (optional)
	 */
	set<T>(key: string, data: T, ttl?: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	/**
	 * Check if key exists in cache
	 * @param key Cache key
	 * @returns true if key exists and not expired
	 */
	has(key: string): boolean {
		return this.get(key) !== null;
	}

	/**
	 * Delete value from cache
	 * @param key Cache key
	 */
	delete(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Invalidate cache entries by pattern
	 * @param pattern String pattern or RegExp to match keys
	 */
	invalidate(pattern: string | RegExp): void {
		const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Get all cache keys
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}
}

// Export singleton instance
export const cache = new Cache();

/**
 * Helper function to generate cache keys
 */
export const cacheKeys = {
	campaigns: {
		list: (filters?: Record<string, unknown>) =>
			filters ? `campaigns:list:${JSON.stringify(filters)}` : "campaigns:list",
		detail: (id: string) => `campaigns:${id}`,
		stats: (id: string) => `campaigns:${id}:stats`,
	},
	users: {
		list: (campaignId: string, filters?: Record<string, unknown>) =>
			filters
				? `users:list:${campaignId}:${JSON.stringify(filters)}`
				: `users:list:${campaignId}`,
		detail: (id: string) => `users:${id}`,
	},
	referrals: {
		list: (campaignId: string) => `referrals:list:${campaignId}`,
		detail: (id: string) => `referrals:${id}`,
	},
	analytics: {
		overview: (campaignId: string, dateRange?: string) =>
			dateRange
				? `analytics:${campaignId}:${dateRange}`
				: `analytics:${campaignId}`,
	},
	leaderboard: {
		get: (campaignId: string, period: string) =>
			`leaderboard:${campaignId}:${period}`,
	},
};
