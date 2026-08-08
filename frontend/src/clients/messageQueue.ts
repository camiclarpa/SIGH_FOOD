export interface LeadMessagePayload {
  idempotencyKey: string;
  timestamp: string;
  data: {
    establishmentName: string;
    decisionMaker: string;
    phone: string;
    topLiquors: string;
    estimatedWeeklyVolume: number;
  };
  retryCount?: number;
  lastError?: string;
}

export interface LeadStatus {
  idempotencyKey: string;
  status: 'queued' | 'processing' | 'processed' | 'failed' | 'dlq';
  timestamp: string;
  crmContactId?: string;
  crmDealId?: string;
  lastError?: string;
  retryCount?: number;
  processedAt?: string;
}

export interface MessageQueueClient {
  sendMessage(payload: LeadMessagePayload): Promise<string>;
  receiveMessage(): Promise<LeadMessagePayload & { _receiptHandle: string } | null>;
  deleteMessage(receiptHandle: string): Promise<void>;
  moveToDLQ(payload: LeadMessagePayload, reason: string): Promise<void>;
  isAlreadyProcessed(idempotencyKey: string): Promise<boolean>;
  markAsProcessed(idempotencyKey: string, metadata?: Record<string, unknown>): Promise<void>;
  incrementRetryCount(idempotencyKey: string): Promise<number>;
  resetRetryCount(idempotencyKey: string): Promise<void>;
  getLeadStatus(idempotencyKey: string): Promise<LeadStatus | null>;
  getMaxRetries(): number;
}

export class UpstashQueueClient implements MessageQueueClient {
  private baseUrl: string;
  private token: string;
  private queueName: string;
  private dlqName: string;
  private maxRetries: number;

  constructor() {
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    this.queueName = process.env.QUEUE_NAME || 'sighfood-leads-queue';
    this.dlqName = process.env.DLQ_NAME || 'sighfood-leads-dlq';
    this.maxRetries = parseInt(process.env.MAX_RETRIES || '3');
  }

  private async execRedisCommand<T = unknown>(command: string[]): Promise<{ result: T }> {
    if (this.baseUrl.includes('your-region')) {
      throw new Error('CONFIG_ERROR: Actualiza UPSTASH_REDIS_REST_URL en tu .env');
    }

    const response = await fetch(`${this.baseUrl}/${command.join('/')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Upstash Error: ${response.statusText}`);
    }
    return response.json() as Promise<{ result: T }>;
  }

  async sendMessage(payload: LeadMessagePayload): Promise<string> {
    const streamKey = `stream:${this.queueName}`;
    
    // Guardar estado inicial "queued" en Redis
    const statusKey = `status:${payload.idempotencyKey}`;
    const initialStatus = JSON.stringify({
      idempotencyKey: payload.idempotencyKey,
      status: 'queued',
      timestamp: payload.timestamp,
    });
    
    await this.execRedisCommand(['SET', statusKey, initialStatus, 'EX', '604800']); // TTL 7 días
    
    const result = await this.execRedisCommand<string>([
      'XADD',
      streamKey,
      '*',
      'data',
      JSON.stringify(payload),
    ]);
    return result.result;
  }

  async receiveMessage(): Promise<LeadMessagePayload & { _receiptHandle: string } | null> {
    const streamKey = `stream:${this.queueName}`;
    
    try {
      // XREAD devuelve [[nombreDelStream, [[idDelMensaje, [campo, valor, …]], …]], …]
      type RespuestaXRead = Array<[string, Array<[string, string[]]>]>;
      const result = await this.execRedisCommand<RespuestaXRead | null>([
        'XREAD',
        'COUNT', '1',
        'BLOCK', '5000',
        'STREAMS',
        streamKey,
        '0',
      ]);

      if (result.result && result.result.length > 0) {
        const streamData = result.result[0][1][0];
        const messageId = streamData[0];
        const payloadStr = streamData[1][1];

        return {
          _receiptHandle: messageId,
          ...(JSON.parse(payloadStr) as LeadMessagePayload),
        };
      }
      return null;
    } catch (error) {
      if ((error as Error).message.includes('CONFIG_ERROR')) throw error;
      return null;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const streamKey = `stream:${this.queueName}`;
    await this.execRedisCommand(['XDEL', streamKey, receiptHandle]);
  }

  async moveToDLQ(payload: LeadMessagePayload, reason: string): Promise<void> {
    const dlqStreamKey = `stream:${this.dlqName}`;
    const dlqPayload = { 
      ...payload, 
      dlqReason: reason, 
      dlqTimestamp: new Date().toISOString() 
    };
    
    // Actualizar estado a "dlq"
    const statusKey = `status:${payload.idempotencyKey}`;
    const dlqStatus = JSON.stringify({
      idempotencyKey: payload.idempotencyKey,
      status: 'dlq',
      timestamp: payload.timestamp,
      lastError: reason,
      processedAt: new Date().toISOString(),
    });
    await this.execRedisCommand(['SET', statusKey, dlqStatus, 'EX', '604800']);
    
    await this.execRedisCommand([
      'XADD',
      dlqStreamKey,
      '*',
      'data',
      JSON.stringify(dlqPayload),
    ]);
  }

  async isAlreadyProcessed(idempotencyKey: string): Promise<boolean> {
    const key = `processed:${idempotencyKey}`;
    const result = await this.execRedisCommand<string | null>(['GET', key]);
    return result.result !== null;
  }

  async markAsProcessed(idempotencyKey: string, metadata?: Record<string, unknown>): Promise<void> {
    const key = `processed:${idempotencyKey}`;
    await this.execRedisCommand(['SET', key, 'true', 'EX', '86400']);
    
    // Actualizar estado a "processed" con metadata del CRM
    const statusKey = `status:${idempotencyKey}`;
    const processedStatus = JSON.stringify({
      idempotencyKey,
      status: 'processed',
      timestamp: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      ...metadata,
    });
    await this.execRedisCommand(['SET', statusKey, processedStatus, 'EX', '604800']);
  }

  async incrementRetryCount(idempotencyKey: string): Promise<number> {
    const key = `retry:${idempotencyKey}`;
    const result = await this.execRedisCommand<number>(['INCR', key]);
    await this.execRedisCommand(['EXPIRE', key, '3600']);
    
    // Actualizar estado a "processing" con contador de reintentos
    const statusKey = `status:${idempotencyKey}`;
    const processingStatus = JSON.stringify({
      idempotencyKey,
      status: 'processing',
      timestamp: new Date().toISOString(),
      retryCount: result.result,
    });
    await this.execRedisCommand(['SET', statusKey, processingStatus, 'EX', '604800']);
    
    return result.result;
  }

  async resetRetryCount(idempotencyKey: string): Promise<void> {
    const key = `retry:${idempotencyKey}`;
    await this.execRedisCommand(['DEL', key]);
  }

  async getLeadStatus(idempotencyKey: string): Promise<LeadStatus | null> {
    const statusKey = `status:${idempotencyKey}`;
    const result = await this.execRedisCommand<string | null>(['GET', statusKey]);

    if (result.result === null) {
      return null;
    }
    
    try {
      return JSON.parse(result.result);
    } catch {
      return null;
    }
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}

export const messageQueueClient = new UpstashQueueClient();