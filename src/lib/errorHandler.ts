export class SystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SystemError';
  }
}

export class ValidationError extends SystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends SystemError {
  constructor(message: string = '身份驗證失敗') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends SystemError {
  constructor(message: string = '權限不足') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

// Centralized error logging
export const errorLogger = {
  log: (error: Error | SystemError, context?: string) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      ...(error instanceof SystemError && { 
        code: error.code, 
        statusCode: error.statusCode,
        details: error.details 
      })
    };
    
    console.error('System Error:', errorInfo);
    
    // 在生產環境中，這裡可以發送到外部日誌服務
    // await sendToLogService(errorInfo);
  }
};
