export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export class ApiResponseBuilder<T = unknown> {
  private response: ApiResponse<T> = {
    success: false,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    }
  };

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  success(data: T): ApiResponse<T> {
    return {
      ...this.response,
      success: true,
      data
    };
  }

  error(code: string, message: string, details?: Record<string, unknown>): ApiResponse<T> {
    return {
      ...this.response,
      success: false,
      error: { code, message, details }
    };
  }

  withPagination(page: number, limit: number, total: number): this {
    this.response.meta!.pagination = {
      page,
      limit,
      total,
      hasMore: page * limit < total
    };
    return this;
  }
}
