interface PerformanceMetrics {
  avg: number;
  min: number;
  max: number;
  count: number;
}

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static startTimer(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // 只保留最近1000筆記錄
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  static getMetrics(operation: string): PerformanceMetrics | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return null;

    const sum = metrics.reduce((a, b) => a + b, 0);
    return {
      avg: sum / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics),
      count: metrics.length
    };
  }

  static getAllMetrics(): Record<string, PerformanceMetrics | null> {
    const result: Record<string, PerformanceMetrics | null> = {};
    for (const [operation] of this.metrics.entries()) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }
}

// 使用裝飾器監控性能
export function performanceMonitor(operation: string) {
  return function (target: Record<string, unknown>, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const endTimer = PerformanceMonitor.startTimer(`${target.constructor.name}.${operation}`);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        endTimer();
      }
    };
  };
}
