export interface Metric {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  unit: 'count' | 'milliseconds' | 'bytes' | 'percent';
}

export interface MetricsClient {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, value: number, tags?: Record<string, string>): void;
  flush(): Promise<void>;
}

class InMemoryMetrics implements MetricsClient {
  private metrics: Metric[] = [];
  private counters: Map<string, number> = new Map();

  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = `${name}:${JSON.stringify(tags || {})}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.metrics.push({
      name,
      value: current + value,
      timestamp: new Date().toISOString(),
      tags,
      unit: 'count',
    });
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      unit: 'count',
    });
  }

  timing(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      unit: 'milliseconds',
    });
  }

  async flush(): Promise<void> {
    console.log('Flushing metrics:', this.metrics.length);
    this.metrics = [];
    this.counters.clear();
  }
}

export function createMetricsMiddleware(metrics: MetricsClient) {
  return async (request: Request, next: () => Promise<Response>) => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || 'unknown';
    
    try {
      metrics.increment('http.requests.total', 1, {
        method: request.method,
        path: new URL(request.url).pathname,
      });

      const response = await next();
      
      const duration = Date.now() - startTime;
      metrics.timing('http.request.duration', duration, {
        method: request.method,
        status: response.status.toString(),
      });

      metrics.increment('http.responses.total', 1, {
        method: request.method,
        status: response.status.toString(),
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      metrics.timing('http.request.duration', duration, {
        method: request.method,
        status: '500',
        error: 'true',
      });
      
      metrics.increment('http.errors.total', 1, {
        method: request.method,
      });
      
      throw error;
    }
  };
}

export const metricsClient = new InMemoryMetrics();