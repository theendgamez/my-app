import { fetchWithAuth } from './fetchWithAuth';

/**
 * Admin API utilities for health checks and system monitoring
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  components: {
    database: {
      status: 'up' | 'down' | 'degraded';
      responseTimeMs?: number;
      details?: string;
    };
    api: {
      status: 'up' | 'down';
    };
    mlService?: {
      status: 'up' | 'down' | 'not_configured';
      details?: string;
    };
  };
  uptime: number;
}

/**
 * Check system health status
 */
export async function checkSystemHealth(): Promise<HealthStatus> {
  return await fetchWithAuth<HealthStatus>('/api/health', {
    useToken: false, // Health check doesn't require authentication
    revalidate: 30, // Cache for 30 seconds
  });
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminDashboardStats() {
  return await fetchWithAuth('/api/admin/dashboard');
}

/**
 * Get admin users with pagination
 */
export async function getAdminUsers(page = 1, limit = 20, search = '', role = '', isActive = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(role && { role }),
    ...(isActive && { isActive }),
  });

  return await fetchWithAuth(`/api/admin/users?${params}`);
}

/**
 * Get admin tickets with pagination and filters
 */
export async function getAdminTickets(page = 1, limit = 50, eventId = '', status = '', zone = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(eventId && { eventId }),
    ...(status && { status }),
    ...(zone && { zone }),
  });

  return await fetchWithAuth(`/api/admin/tickets?${params}`);
}

/**
 * Get admin payments with pagination and filters
 */
export async function getAdminPayments(page = 1, limit = 50, status = '', eventId = '', paymentMethod = '') {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status }),
    ...(eventId && { eventId }),
    ...(paymentMethod && { paymentMethod }),
  });

  return await fetchWithAuth(`/api/admin/payments?${params}`);
}

/**
 * Update ticket status (admin only)
 */
export async function updateTicketStatus(ticketId: string, status: string, usageTimestamp?: number) {
  return await fetchWithAuth(`/api/admin/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, usageTimestamp }),
  });
}

/**
 * Update payment status (admin only)
 */
export async function updatePaymentStatus(paymentId: string, status: string) {
  return await fetchWithAuth(`/api/admin/payments/${paymentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Get lottery events for admin
 */
export async function getAdminLotteryEvents() {
  return await fetchWithAuth('/api/admin/lottery/events');
}

/**
 * Get lottery registrations for specific event
 */
export async function getAdminLotteryRegistrations(eventId: string) {
  return await fetchWithAuth(`/api/admin/lottery/registrations/${eventId}`);
}

/**
 * Verify ticket with QR data (admin only)
 */
export async function verifyTicketAdmin(qrData: string) {
  return await fetchWithAuth('/api/admin/tickets/verify', {
    method: 'POST',
    body: JSON.stringify({ qrData }),
  });
}

/**
 * Check if current user is admin
 */
export async function checkAdminStatus(): Promise<{ isAdmin: boolean }> {
  try {
    return await fetchWithAuth<{ isAdmin: boolean }>('/api/auth/check-admin', {
      revalidate: 300, // Cache for 5 minutes
    });
  } catch {
    return { isAdmin: false };
  }
}

/**
 * Monitor system health with periodic checks
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: ((health: HealthStatus) => void)[] = [];

  static getInstance(): HealthMonitor {
    if (!this.instance) {
      this.instance = new HealthMonitor();
    }
    return this.instance;
  }

  /**
   * Start monitoring system health
   */
  startMonitoring(intervalMs = 60000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        const health = await checkSystemHealth();
        this.callbacks.forEach(callback => callback(health));
      } catch (error) {
        console.error('Health check failed:', error);
        // Notify callbacks about unhealthy status
        const unhealthyStatus: HealthStatus = {
          status: 'unhealthy',
          version: 'unknown',
          timestamp: new Date().toISOString(),
          components: {
            database: { status: 'down' },
            api: { status: 'down' }
          },
          uptime: 0
        };
        this.callbacks.forEach(callback => callback(unhealthyStatus));
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Subscribe to health status updates
   */
  subscribe(callback: (health: HealthStatus) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }
}

/**
 * Generic admin fetch function that wraps fetchWithAuth with admin-specific defaults
 */
export async function adminFetch<T = unknown>(
  url: string,
  options: RequestInit & {
    useToken?: boolean;
    revalidate?: number | false;
    tags?: string[];
  } = {}
): Promise<T> {
  // Default to using token for admin requests
  const adminOptions = {
    useToken: true,
    ...options,
    headers: {
      ...options.headers,
      // Always include admin-specific headers
      'x-admin-request': 'true',
    }
  };

  try {
    return await fetchWithAuth<T>(url, adminOptions);
  } catch (error) {
    console.error('Admin API request failed:', { url, error });
    throw error;
  }
}

/**
 * Verify admin access before making API calls
 */
export async function verifyAdminAccess(): Promise<boolean> {
  try {
    const result = await checkAdminStatus();
    return result.isAdmin;
  } catch (error) {
    console.error('Admin access verification failed:', error);
    return false;
  }
}

/**
 * Admin-specific error handler
 */
export function handleAdminError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return '您沒有管理員權限執行此操作';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return '請重新登入以繼續';
    }
    return error.message;
  }
  return '發生未知錯誤';
}
