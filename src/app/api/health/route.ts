import { NextResponse } from 'next/server';
import db from '@/lib/db';

interface HealthCheckResult {
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

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  let databaseResponseTime: number | undefined;
  
  // Default health check result
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    components: {
      database: { status: 'down' },
      api: { status: 'up' }
    },
    uptime: process.uptime()
  };
  
  // Test database connectivity
  try {
    const dbStartTime = Date.now();
    // Simple DB operation to check health
    await db.users.findMany();
    databaseResponseTime = Date.now() - dbStartTime;
    
    healthCheck.components.database = {
      status: 'up',
      responseTimeMs: databaseResponseTime
    };
    
    // Add warning if response time is high
    if (databaseResponseTime > 500) {
      healthCheck.components.database.status = 'degraded';
      healthCheck.components.database.details = 'High response time';
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    healthCheck.components.database = {
      status: 'down',
      details: error instanceof Error ? error.message : 'Unknown database error'
    };
    healthCheck.status = 'unhealthy';
  }
  
  // Check ML service if configured
  if (process.env.ML_SERVICE_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      healthCheck.components.mlService = {
        status: mlResponse.ok ? 'up' : 'down',
        details: mlResponse.ok ? undefined : `Status: ${mlResponse.status}`
      };
      
      // Update overall status if ML service is down
      if (!mlResponse.ok) {
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      console.error('ML service health check failed:', error);
      healthCheck.components.mlService = {
        status: 'down',
        details: error instanceof Error ? error.message : 'Unknown ML service error'
      };
      healthCheck.status = 'degraded';
    }
  } else {
    healthCheck.components.mlService = {
      status: 'not_configured'
    };
  }
  
  // Calculate total response time
  const totalResponseTime = Date.now() - startTime;
  
  // Return health check result with appropriate status code
  return NextResponse.json(healthCheck, {
    status: healthCheck.status === 'healthy' ? 200 : 
           healthCheck.status === 'degraded' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-Response-Time': `${totalResponseTime}ms`
    }
  });
}
