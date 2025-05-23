interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface CacheEntry {
  data: unknown;
  expires: number;
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry>();

  static async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
    const cached = this.cache.get(fullKey);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(fullKey);
      return null;
    }
    
    return cached.data as T;
  }

  static async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || 300; // 5 minutes default
    const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
    const expires = Date.now() + (ttl * 1000);
    
    this.cache.set(fullKey, { data, expires });
  }

  static async invalidate(pattern: string): Promise<void> {
    const keys = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    );
    keys.forEach(key => this.cache.delete(key));
  }

  // 清理過期緩存
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// 定期清理緩存
setInterval(() => {
  CacheManager.cleanup();
}, 60000); // 每分鐘清理一次
