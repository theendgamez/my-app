import { CacheManager } from '@/lib/cache';

/**
 * Utility for handling auth state change events across components
 * This helps components react to auth state changes without a page refresh
 */

type AuthEventListener = () => void;

interface UserData {
  userId: string;
  userName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  // Add a listener for auth state changes
  public subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners when auth state changes
  public emit(): void {
    this.listeners.forEach(listener => listener());
  }

  // Clear user-specific cache on logout
  public emitLogout(userId: string): void {
    CacheManager.invalidateUserCache(userId);
    this.emit();
  }

  // Cache user data on login
  public emitLogin(userData: UserData): void {
    CacheManager.cacheUserAuth(userData.userId, userData);
    this.emit();
  }

  // Clear cache on user data update
  public emitUserUpdate(userId: string): void {
    CacheManager.invalidateUserCache(userId);
    this.emit();
  }
}

// Create a singleton instance
const authEvents = new AuthEventEmitter();

export default authEvents;
