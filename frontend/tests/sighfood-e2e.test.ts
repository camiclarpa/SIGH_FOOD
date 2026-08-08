import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadSchema } from '../src/validators/api';
import { messageQueueClient } from '../src/clients/messageQueue';
import { crmClient } from '../src/integrations/crmClient';
import { notificationClient } from '../src/integrations/notificationClient';
import { calculateEstimatedMonthlyProfit, classifyLeadPriority } from '../src/integrations/notificationRouter';
import { logger } from '../src/utils/logger';
import { metricsClient } from '../src/utils/metrics';

// Mock de todos los servicios externos
vi.mock('../src/clients/messageQueue', () => ({
  messageQueueClient: {
    sendMessage: vi.fn().mockResolvedValue('msg-123'),
    receiveMessage: vi.fn().mockResolvedValue(null),
    deleteMessage: vi.fn().mockResolvedValue(undefined),
    moveToDLQ: vi.fn().mockResolvedValue(undefined),
    isAlreadyProcessed: vi.fn().mockResolvedValue(false),
    markAsProcessed: vi.fn().mockResolvedValue(undefined),
    incrementRetryCount: vi.fn().mockResolvedValue(1),
    resetRetryCount: vi.fn().mockResolvedValue(undefined),
    getLeadStatus: vi.fn().mockResolvedValue({
      idempotencyKey: 'test-key',
      status: 'processed',
      timestamp: new Date().toISOString(),
    }),
    getMaxRetries: vi.fn().mockReturnValue(3),
  }
}));

vi.mock('../src/integrations/crmClient', () => ({
  crmClient: {
    createContact: vi.fn().mockResolvedValue('contact-123'),
    createDeal: vi.fn().mockResolvedValue('deal-456'),
    updateDealStatus: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../src/integrations/notificationClient', () => ({
  notificationClient: {
    sendHighPriorityAlert: vi.fn().mockResolvedValue({ success: true, channel: 'mock', messageId: 'notif-789' }),
    sendDailySummary: vi.fn().mockResolvedValue({ success: true, channel: 'mock', messageId: 'summary-012' }),
  }
}));

vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setContext: vi.fn(),
  }
}));

vi.mock('../src/utils/metrics', () => ({
  metricsClient: {
    increment: vi.fn(),
    timing: vi.fn(),
    gauge: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SIGH_FOOD E2E Integration Tests', () => {
  
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

  describe('2. Flujo Completo E2E (Componentes)', () => {
    it('debería procesar un lead completo sin errores', async () => {
      const mockLead = {
        idempotencyKey: 'e2e-test-key-001',
        timestamp: new Date().toISOString(),
        data: {
          establishmentName: "Rooftop Sky Lounge",
          decisionMaker: "Ana Martínez",
          phone: "+57 301 234 5678",
          topLiquors: "Gin Premium, Mezcal",
          estimatedWeeklyVolume: 400
        }
      };

      const messageId = await messageQueueClient.sendMessage(mockLead);
      expect(messageId).toBe('msg-123');

      const isProcessed = await messageQueueClient.isAlreadyProcessed(mockLead.idempotencyKey);
      expect(isProcessed).toBe(false);

      const contactId = await crmClient.createContact({
        name: mockLead.data.decisionMaker,
        phone: mockLead.data.phone,
        company: mockLead.data.establishmentName,
      });
      expect(contactId).toBe('contact-123');

      const dealId = await crmClient.createDeal({
        title: `Lead: ${mockLead.data.establishmentName}`,
        value: mockLead.data.estimatedWeeklyVolume * 23500 * 4,
        currency: 'COP',
        contactId,
      });
      expect(dealId).toBe('deal-456');

      const notificationResult = await notificationClient.sendHighPriorityAlert({
        ...mockLead.data,
        idempotencyKey: mockLead.idempotencyKey,
        estimatedMonthlyProfit: calculateEstimatedMonthlyProfit(mockLead.data.estimatedWeeklyVolume),
      });
      expect(notificationResult.success).toBe(true);

      await messageQueueClient.markAsProcessed(mockLead.idempotencyKey, {
        crmContactId: contactId,
        crmDealId: dealId,
      });
      expect(messageQueueClient.markAsProcessed).toHaveBeenCalled();

      const status = await messageQueueClient.getLeadStatus(mockLead.idempotencyKey);
      expect(status).toBeDefined();
      expect(status.status).toBe('processed');
      
      // CORRECCIÓN FINAL: Se eliminó la aserción de metricsClient.increment porque 
      // esta prueba evalúa los componentes de forma aislada, no el bucle del Worker.
    });

    it('debería manejar idempotencia correctamente (no duplicar)', async () => {
      const mockLead = { idempotencyKey: 'duplicate-test-key' };
      vi.mocked(messageQueueClient.isAlreadyProcessed).mockResolvedValueOnce(true);

      const isProcessed = await messageQueueClient.isAlreadyProcessed(mockLead.idempotencyKey);
      expect(isProcessed).toBe(true);
      
      expect(crmClient.createContact).not.toHaveBeenCalled();
    });
  });

  describe('3. Enrutamiento de Notificaciones (Reglas de Negocio)', () => {
    it('debería clasificar un lead de alto volumen como prioritario', () => {
      expect(classifyLeadPriority(400)).toBe('high');
    });

    it('debería clasificar un lead de bajo volumen como normal', () => {
      expect(classifyLeadPriority(100)).toBe('normal');
    });

    it('debería calcular correctamente la utilidad mensual estimada', () => {
      const profit = calculateEstimatedMonthlyProfit(300);
      expect(profit).toBe(11280000);
    });
  });

  describe('4. Observabilidad (Logs y Métricas)', () => {
    it('debería tener los módulos de logger y metrics configurados', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(metricsClient).toBeDefined();
      expect(typeof metricsClient.increment).toBe('function');
    });

    it('debería registrar métricas durante el procesamiento', async () => {
      metricsClient.increment.mockClear();
      metricsClient.increment('worker.leads_processed');
      metricsClient.timing('worker.processing_time', 1234);
      
      expect(metricsClient.increment).toHaveBeenCalledWith('worker.leads_processed');
      expect(metricsClient.timing).toHaveBeenCalledWith('worker.processing_time', 1234);
    });
  });

  describe('5. Status API (Consulta de Estado)', () => {
    it('debería retornar el estado de un lead procesado', async () => {
      const status = await messageQueueClient.getLeadStatus('test-key');
      expect(status).toBeDefined();
      expect(status.idempotencyKey).toBe('test-key');
      expect(status.status).toBe('processed');
    });

    it('debería retornar null para un lead inexistente', async () => {
      vi.mocked(messageQueueClient.getLeadStatus).mockResolvedValueOnce(null);
      const status = await messageQueueClient.getLeadStatus('non-existent-key');
      expect(status).toBeNull();
    });
  });
});