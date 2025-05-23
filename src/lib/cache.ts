import { Events, Payment, Ticket } from '@/types';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface CacheEntry {
  data: unknown;
  expires: number;
}

interface UserAuthData {
  userId: string;
  userName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalRevenue: number;
  activeTickets: number;
  [key: string]: unknown;
}

interface NotificationData {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  [key: string]: unknown;
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry>();
  
  // Add missing TTL constants
  private static readonly USER_AUTH_TTL = 3600; // 1 hour
  private static readonly EVENT_DATA_TTL = 600; // 10 minutes

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

  // HIGH PRIORITY CACHING METHODS

  // Event Listings - Cache for 5-10 minutes
  static async cacheEventListings(events: Events[], ttl = 600): Promise<void> {
    await this.set('all-events', events, { prefix: 'events', ttl });
  }

  static async getEventListings(): Promise<Events[] | null> {
    return this.get('all-events', { prefix: 'events' });
  }

  // User Authentication Data - Cache for session duration
  static async cacheUserAuth(userId: string, userData: UserAuthData): Promise<void> {
    const key = `user_auth_${userId}`;
    await this.set(key, userData, { ttl: this.USER_AUTH_TTL });
  }

  static async getUserAuth(userId: string): Promise<UserAuthData | null> {
    const key = `user_auth_${userId}`;
    return this.get<UserAuthData>(key);
  }

  // Payment Records - Cache for 30 minutes
  static async cachePaymentRecord(paymentId: string, paymentData: Payment, ttl = 1800): Promise<void> {
    await this.set(`payment:${paymentId}`, paymentData, { prefix: 'payments', ttl });
  }

  static async getPaymentRecord(paymentId: string): Promise<Payment | null> {
    return this.get(`payment:${paymentId}`, { prefix: 'payments' });
  }

  // Admin Dashboard Stats - Cache for 2-3 minutes
  static async cacheDashboardStats(stats: DashboardStats, ttl = 180): Promise<void> {
    await this.set('dashboard-stats', stats, { prefix: 'admin', ttl });
  }

  static async getDashboardStats(): Promise<DashboardStats | null> {
    return this.get('dashboard-stats', { prefix: 'admin' });
  }

  // MEDIUM PRIORITY CACHING METHODS

  // User Tickets - Cache for 5 minutes
  static async cacheUserTickets(userId: string, tickets: Ticket[], ttl = 300): Promise<void> {
    await this.set(`tickets:${userId}`, tickets, { prefix: 'users', ttl });
  }

  static async getUserTickets(userId: string): Promise<Ticket[] | null> {
    return this.get(`tickets:${userId}`, { prefix: 'users' });
  }

  // Event Details - Cache for 10 minutes
  static async cacheEventDetails(eventId: string, eventData: Events, ttl = 600): Promise<void> {
    await this.set(`event:${eventId}`, eventData, { prefix: 'events', ttl });
  }

  static async getEventDetails(eventId: string): Promise<Events | null> {
    return this.get<Events>(`event:${eventId}`, { prefix: 'events' });
  }

  // Notification Data - Cache for 1-2 minutes
  static async cacheNotifications(userId: string, notifications: NotificationData[], ttl = 120): Promise<void> {
    await this.set(`notifications:${userId}`, notifications, { prefix: 'users', ttl });
  }

  static async getNotifications(userId: string): Promise<NotificationData[] | null> {
    return this.get(`notifications:${userId}`, { prefix: 'users' });
  }

  // Cache invalidation patterns
  static async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidate(`users:auth:${userId}`);
    await this.invalidate(`users:tickets:${userId}`);
    await this.invalidate(`users:notifications:${userId}`);
  }

  static async invalidateEventCache(eventId?: string): Promise<void> {
    if (eventId) {
      await this.invalidate(`events:event:${eventId}`);
    }
    await this.invalidate('events:all-events');
  }

  static async invalidatePaymentCache(paymentId: string): Promise<void> {
    await this.invalidate(`payments:payment:${paymentId}`);
  }

  static async invalidateAdminCache(): Promise<void> {
    await this.invalidate('admin:dashboard-stats');
  }
}

// 定期清理緩存
setInterval(() => {
  CacheManager.cleanup();
}, 60000); // 每分鐘清理一次
