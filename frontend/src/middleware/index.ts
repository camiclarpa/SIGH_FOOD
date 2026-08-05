import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  request: Request;
}

export async function loggingMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();
  const url = new URL(request.url);
  
  logger.setContext({
    requestId,
    method: request.method,
    path: url.pathname,
  });

  logger.info('Request started', {
    requestId,
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get('user-agent'),
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      status: response.status,
      duration: `${duration}ms`,
    });

    response.headers.set('x-request-id', requestId);
    response.headers.set('x-response-time', `${duration}ms`);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Request failed', 
      error instanceof Error ? error : new Error('Unknown error'),
      {
        requestId,
        duration: `${duration}ms`,
      }
    );
    
    throw error;
  }
}

export async function metricsMiddleware(
  request: Request,
  next: () => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(request.url);
  
  metricsClient.increment('http.requests.total', 1, {
    method: request.method,
    path: url.pathname,
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;
    
    metricsClient.timing('http.request.duration', duration, {
      method: request.method,
      status: response.status.toString(),
      path: url.pathname,
    });

    metricsClient.increment('http.responses.total', 1, {
      method: request.method,
      status: response.status.toString(),
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    metricsClient.timing('http.request.duration', duration, {
      method: request.method,
      status: '500',
      path: url.pathname,
      error: 'true',
    });
    
    metricsClient.increment('http.errors.total', 1, {
      method: request.method,
      path: url.pathname,
    });
    
    throw error;
  }
}

export function createMiddlewareChain(...middlewares: Function[]) {
  return async (request: Request, handler: () => Promise<Response>): Promise<Response> => {
    let currentHandler = handler;
    
    for (const middleware of middlewares.reverse()) {
      const prevHandler = currentHandler;
      currentHandler = () => middleware(request, prevHandler);
    }
    
    return currentHandler();
  };
}