export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;
  ping(): Promise<string>;
  disconnect(): Promise<void>;
}

/** Respuesta REST de Upstash: siempre viene envuelta en `{ result: … }` */
interface UpstashResponse<T> {
  result: T;
}

// Implementación para Cloudflare Workers (Upstash Redis)
export class UpstashRedisClient implements RedisClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || '';
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  }

  private async request<T>(command: string[], options?: RequestInit): Promise<UpstashResponse<T>> {
    const path = command.map(encodeURIComponent).join('/');
    const response = await fetch(`${this.baseUrl}/${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Redis error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<UpstashResponse<T>>;
  }

  async get(key: string): Promise<string | null> {
    const result = await this.request<string | null>(['get', key]);
    return result.result;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.request<string>(['set', key, value, 'EX', ttl.toString()]);
    } else {
      await this.request<string>(['set', key, value]);
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.request<number>(['del', key]);
    return result.result > 0;
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.request<number>(['expire', key, ttl.toString()]);
  }

  async ping(): Promise<string> {
    const result = await this.request<string>(['ping']);
    return result.result;
  }

  async disconnect(): Promise<void> {
    // No-op for REST API
  }
}

// Implementación genérica
export class GenericRedisClient implements RedisClient {
  // El cliente subyacente (ioredis o similar) se declarará al implementar esta clase.

  constructor() {
    // Implementación para ioredis o similar
    // this.client = new Redis(config.redis.url);
  }

  async get(_key: string): Promise<string | null> {
    // return this.client.get(key);
    throw new Error('Not implemented');
  }

  async set(_key: string, _value: string, _ttl?: number): Promise<void> {
    // if (ttl) {
    //   await this.client.setex(key, ttl, value);
    // } else {
    //   await this.client.set(key, value);
    // }
    throw new Error('Not implemented');
  }

  async delete(_key: string): Promise<boolean> {
    // const result = await this.client.del(key);
    // return result > 0;
    throw new Error('Not implemented');
  }

  async expire(_key: string, _ttl: number): Promise<void> {
    // await this.client.expire(key, ttl);
    throw new Error('Not implemented');
  }

  async ping(): Promise<string> {
    // return this.client.ping();
    throw new Error('Not implemented');
  }

  async disconnect(): Promise<void> {
    // await this.client.quit();
    throw new Error('Not implemented');
  }
}

// Factory para crear el cliente apropiado
export function createRedisClient(): RedisClient {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    return new UpstashRedisClient();
  }
  return new GenericRedisClient();
}

export const redisClient = createRedisClient();
