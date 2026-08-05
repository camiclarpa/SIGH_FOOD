/**
 * Tests unitarios para QueueClient
 * RFC-001: Capa Backend de Ingesta Asíncrona
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueClient, DEFAULT_QUEUE_CONFIG } from '../../src/queue/upstash/QueueClient';

// Mock de Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  lpush: vi.fn(),
  brpop: vi.fn(),
  llen: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => mockRedis,
  },
}));

describe('QueueClient', () => {
  let client: QueueClient;

  beforeEach(() => {
    client = new QueueClient(DEFAULT_QUEUE_CONFIG);
    vi.clearAllMocks();
  });

  describe('enqueueLead()', () => {
    it('debería encolar un lead nuevo', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.lpush.mockResolvedValue(1);

      const lead = { establecimiento: 'Bar Test', whatsapp: '+573001234567' };
      const result = await client.enqueueLead(lead, 'pilot:+573001234567:2026-08-05');

      expect(result.status).toBe('queued');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'pilot:+573001234567:2026-08-05',
        '1',
        { ex: 86400 }
      );
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'lead-events-log',
        JSON.stringify(lead)
      );
    });

    it('debería retornar duplicate si la clave ya existe', async () => {
      mockRedis.get.mockResolvedValue('1');

      const lead = { establecimiento: 'Bar Test', whatsapp: '+573001234567' };
      const result = await client.enqueueLead(lead, 'pilot:+573001234567:2026-08-05');

      expect(result.status).toBe('duplicate');
      expect(mockRedis.set).not.toHaveBeenCalled();
      expect(mockRedis.lpush).not.toHaveBeenCalled();
    });
  });

  describe('getQueueLength()', () => {
    it('debería retornar la longitud de la cola', async () => {
      mockRedis.llen.mockResolvedValue(5);

      const length = await client.getQueueLength();
      expect(length).toBe(5);
    });
  });

  describe('moveToDLQ()', () => {
    it('debería mover un evento a la DLQ', async () => {
      mockRedis.lpush.mockResolvedValue(1);

      const event = JSON.stringify({ establecimiento: 'Bar Test' });
      await client.moveToDLQ(event, 'CRM timeout');

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'dead-letter-queue',
        expect.stringContaining('CRM timeout')
      );
    });
  });
});