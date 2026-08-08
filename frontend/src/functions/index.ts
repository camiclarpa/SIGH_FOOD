import { LeadSchema } from '../validators/api';
import { messageQueueClient } from '../clients/messageQueue';
import { createErrorResponse } from '../utils/validation';
import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

/**
 * OPTIMIZACIÓN DE COLD START:
 * Las instancias de clientes (Redis, Logger, Metrics) se inicializan 
 * a NIVEL DE MÓDULO (fuera del handler). 
 * En Edge Runtime, esto significa que se reutilizan entre invocaciones
 * siempre que el contenedor esté "caliente", evitando reconexiones costosas.
 */

interface EdgeResponse {
  status: number;
  headers: Record<string, string>;
  /** Se serializa con JSON.stringify antes de salir. */
  body: unknown;
}

export async function handleRequest(request: Request): Promise<Response> {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const startTime = Date.now();
  
  logger.setContext({ requestId, path: new URL(request.url).pathname });
  logger.info('Request received', { method: request.method });
  
  try {
    const url = new URL(request.url);
    let response: EdgeResponse;
    
    if (request.method === 'GET' && url.pathname === '/health') {
      response = await handleHealthCheck(requestId);
    } else if (request.method === 'POST' && url.pathname === '/api/leads') {
      response = await handleCreateLead(request, requestId);
    } else if (request.method === 'GET' && url.pathname === '/api/leads/status') {
      response = await handleGetLeadStatus(url, requestId);
    } else {
      response = {
        status: 404,
        headers: { 'content-type': 'application/json' },
        body: { error: 'Not found' },
      };
    }
    
    const duration = Date.now() - startTime;
    response.headers['x-request-id'] = requestId;
    response.headers['x-response-time'] = `${duration}ms`;
    
    logger.info('Response sent', { status: response.status, duration });
    metricsClient.timing('http.request.duration', duration);
    
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: response.headers,
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Unhandled error', error as Error, { duration });
    
    return new Response(
      JSON.stringify(createErrorResponse('Internal server error', requestId, 500)),
      {
        status: 500,
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
      }
    );
  }
}

async function handleCreateLead(request: Request, requestId: string): Promise<EdgeResponse> {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const validationResult = LeadSchema.safeParse(body);
    
    if (!validationResult.success) {
      metricsClient.increment('leads.validation_failed');
      return {
        status: 400,
        headers: { 'content-type': 'application/json' },
        body: { success: false, error: 'Validation failed', details: validationResult.error.issues },
      };
    }
    
    const idempotencyKey = crypto.randomUUID();
    const messageId = await messageQueueClient.sendMessage({
      idempotencyKey,
      timestamp: new Date().toISOString(),
      data: validationResult.data,
    });
    
    const duration = Date.now() - startTime;
    metricsClient.increment('leads.queued_success');
    
    return {
      status: 202,
      headers: { 'content-type': 'application/json' },
      body: {
        success: true,
        message: 'Lead encolado',
        idempotencyKey,
        messageId,
        metadata: { duration, estimatedProcessingTime: '< 5 minutos' },
      },
    };
  } catch (error) {
    return {
      status: 500,
      headers: { 'content-type': 'application/json' },
      body: createErrorResponse(error instanceof Error ? error.message : 'Unknown error', requestId, 500),
    };
  }
}

async function handleGetLeadStatus(url: URL, _requestId: string): Promise<EdgeResponse> {
  const idempotencyKey = url.searchParams.get('idempotencyKey');
  if (!idempotencyKey) {
    return { status: 400, headers: { 'content-type': 'application/json' }, body: { error: 'Missing idempotencyKey' } };
  }
  
  const status = await messageQueueClient.getLeadStatus(idempotencyKey);
  if (!status) {
    return { status: 404, headers: { 'content-type': 'application/json' }, body: { error: 'Lead not found' } };
  }
  
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { success: true, data: status },
  };
}

async function handleHealthCheck(_requestId: string): Promise<EdgeResponse> {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { status: 'healthy', version: '4.0.0-optimized', timestamp: new Date().toISOString() },
  };
}

const edgeHandler = {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  },
};

export default edgeHandler;