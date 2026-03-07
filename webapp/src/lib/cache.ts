/**
 * Simple in-memory cache for data fetching
 * Uses Map for key-value storage with TTL support
 */

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl?: number;
}

class Cache {
	private cache = new Map<string, CacheEntry<unknown>>();

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		if (entry.ttl) {
			const now = Date.now();
			if (now - entry.timestamp > entry.ttl) {
				this.cache.delete(key);
				return null;
			}
		}

		return entry.data as T;
	}

	set<T>(key: string, data: T, ttl?: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl,
		});
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	delete(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	invalidate(pattern: string | RegExp): void {
		const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
			}
		}
	}

	size(): number {
		return this.cache.size;
	}

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
	posts: {
		list: (filters?: Record<string, unknown>) =>
			filters ? `posts:list:${JSON.stringify(filters)}` : "posts:list",
		detail: (id: string) => `posts:${id}`,
	},
	platforms: {
		list: () => "platforms:list",
		detail: (id: string) => `platforms:${id}`,
	},
	media: {
		list: (filters?: Record<string, unknown>) =>
			filters ? `media:list:${JSON.stringify(filters)}` : "media:list",
		detail: (id: string) => `media:${id}`,
	},
	analytics: {
		overview: (dateRange?: string) =>
			dateRange ? `analytics:overview:${dateRange}` : "analytics:overview",
		timeseries: (dateRange?: string) =>
			dateRange ? `analytics:timeseries:${dateRange}` : "analytics:timeseries",
		platforms: () => "analytics:platforms",
		topPosts: () => "analytics:top-posts",
	},
	conversations: {
		list: () => "conversations:list",
		detail: (id: string) => `conversations:${id}`,
	},
	blog: {
		list: (filters?: Record<string, unknown>) =>
			filters ? `blog:list:${JSON.stringify(filters)}` : "blog:list",
		detail: (id: string) => `blog:${id}`,
	},
	voiceProfile: {
		get: () => "voice-profile",
	},
};
