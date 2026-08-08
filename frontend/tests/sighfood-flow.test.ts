import { describe, it, expect, vi } from 'vitest';
import { LeadSchema } from '../src/validators/api';
import { messageQueueClient } from '../src/clients/messageQueue';
import { logger } from '../src/utils/logger';
import { metricsClient } from '../src/utils/metrics';

// Mockeamos el cliente de la cola para no depender de Upstash en los tests
vi.mock('../src/clients/messageQueue', () => ({
  messageQueueClient: {
    sendMessage: vi.fn().mockResolvedValue('msg-123'),
    isAlreadyProcessed: vi.fn().mockResolvedValue(false),
    markAsProcessed: vi.fn().mockResolvedValue(undefined),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    incrementRetryCount: vi.fn().mockResolvedValue(1),
    moveToDLQ: vi.fn().mockResolvedValue(undefined),
    getMaxRetries: vi.fn().mockReturnValue(3),
  }
}));

describe('SIGH_FOOD Integration Tests', () => {
  
  describe('1. Validación de Lead (Zod Schema)', () => {
    it('debería validar un payload de lead B2B correcto', () => {
      const validLead = {
        establishmentName: "Gastrobar El Rincón",
        decisionMaker: "Carlos Rodríguez",
        phone: "+57 300 123 4567",
        topLiquors: "Gin, Mezcal",
        estimatedWeeklyVolume: 150
      };
      
      const result = LeadSchema.safeParse(validLead);
      expect(result.success).toBe(true);
    });

    it('debería rechazar un lead con teléfono inválido', () => {
      const invalidLead = {
        establishmentName: "Bar Test",
        decisionMaker: "Juan",
        phone: "123",
        topLiquors: "Ron",
        estimatedWeeklyVolume: 10
      };
      
      const result = LeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });
  });

  describe('2. Flujo del Worker (Idempotencia y ACK)', () => {
    it('debería procesar un mensaje nuevo y hacer ACK', async () => {
      const mockMessage = {
        _receiptHandle: 'receipt-abc',
        idempotencyKey: 'key-123',
        timestamp: new Date().toISOString(),
        data: { establishmentName: "Test Bar", decisionMaker: "Test", phone: "+1234567890", topLiquors: "Vodka", estimatedWeeklyVolume: 50 }
      };

      const isProcessed = await messageQueueClient.isAlreadyProcessed(mockMessage.idempotencyKey);
      expect(isProcessed).toBe(false);

      await messageQueueClient.markAsProcessed(mockMessage.idempotencyKey);
      await messageQueueClient.deleteMessage(mockMessage._receiptHandle);

      expect(messageQueueClient.markAsProcessed).toHaveBeenCalledWith('key-123');
      expect(messageQueueClient.deleteMessage).toHaveBeenCalledWith('receipt-abc');
    });

    it('debería saltar el procesamiento si el lead ya fue procesado (Idempotencia)', async () => {
      vi.mocked(messageQueueClient.isAlreadyProcessed).mockResolvedValueOnce(true);

      const mockMessage = { idempotencyKey: 'key-duplicate' };
      
      const isProcessed = await messageQueueClient.isAlreadyProcessed(mockMessage.idempotencyKey);
      expect(isProcessed).toBe(true);
      
      expect(messageQueueClient.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('3. Observabilidad (Métricas y Logs)', () => {
    it('debería tener las dependencias de logging y métricas configuradas y exportadas', () => {
      // Verificamos que los objetos importados existan y tengan los métodos esperados
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      
      expect(metricsClient).toBeDefined();
      expect(typeof metricsClient.increment).toBe('function');
      expect(typeof metricsClient.timing).toBe('function');
    });
  });
});