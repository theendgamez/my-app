// 輸入驗證
export class InputValidator {
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>&"']/g, (char) => {
        const entities: { [key: string]: string } = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#x27;'
        };
        return entities[char];
      });
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('密碼長度至少8位');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('必須包含大寫字母');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('必須包含小寫字母');
    }
    if (!/\d/.test(password)) {
      errors.push('必須包含數字');
    }
    // Make special characters optional - only require 3 out of 4 criteria
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // Count how many criteria are met
    const criteriaMet = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      hasSpecialChar
    ].filter(Boolean).length;
    
    // Require at least 4 out of 5 criteria (length + 3 out of 4 character types)
    if (criteriaMet < 4) {
      if (!hasSpecialChar && errors.length === 0) {
        errors.push('建議包含特殊字符以增強安全性');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Next.js 兼容的速率限制實現
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class NextJSRateLimit {
  private static cache = new Map<string, RateLimitEntry>();

  static create(config: RateLimitConfig) {
    return {
      check: (identifier: string): { allowed: boolean; message?: string } => {
        const now = Date.now();
        const key = `${identifier}_${Math.floor(now / config.windowMs)}`;
        
        const entry = this.cache.get(key) || { count: 0, resetTime: now + config.windowMs };
        
        if (now > entry.resetTime) {
          entry.count = 0;
          entry.resetTime = now + config.windowMs;
        }
        
        entry.count++;
        this.cache.set(key, entry);
        
        // 清理過期的緩存條目
        this.cleanup();
        
        if (entry.count > config.max) {
          return { allowed: false, message: config.message };
        }
        
        return { allowed: true };
      }
    };
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }
}

// 速率限制配置
export const rateLimitConfigs = {
  auth: NextJSRateLimit.create({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Increased from 5 to 20 attempts per window
    message: '登錄嘗試次數過多，請稍後再試'
  }),
  
  api: NextJSRateLimit.create({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // Increased from 100 to 300 requests per minute
    message: 'API 請求過於頻繁'
  }),

  ticketPurchase: NextJSRateLimit.create({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 purchases per 5 minutes
    message: '購票頻率過高，請稍後再試'
  })
};

// 安全標頭配置
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
