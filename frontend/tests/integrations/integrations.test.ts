/**
 * Tests unitarios para Integraciones Externas
 * RFC-001: Capa de Integraciones Externas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HubSpotLeadRepository } from '../../src/integrations/crm/HubSpotClient';
import { PipedriveLeadRepository } from '../../src/integrations/crm/PipedriveClient';
import { SlackNotifier } from '../../src/integrations/notifications/SlackNotifier';
import { IntegrationOrchestrator } from '../../src/integrations/IntegrationOrchestrator';
import type { LeadRepository } from '../../src/domain/ports/LeadRepository';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HubSpotLeadRepository', () => {
  let repository: HubSpotLeadRepository;

  beforeEach(() => {
    repository = new HubSpotLeadRepository('test-token', 'https://api.hubapi.com', 5000);
    vi.clearAllMocks();
  });

  it('debería guardar un lead exitosamente', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 201,
      json: async () => ({ id: '12345' }),
    });

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      ciudad: 'Medellín',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await repository.guardar(lead);

    expect(result.success).toBe(true);
    expect(result.crmRecordId).toBe('12345');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('debería manejar duplicados (409)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 409,
      text: async () => 'Contact already exists',
    });

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await repository.guardar(lead);

    expect(result.success).toBe(true);
    expect(result.crmRecordId).toBe('duplicate');
  });

  it('debería manejar rate limit (429)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 429,
      text: async () => 'Rate limit exceeded',
    });

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await repository.guardar(lead);

    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit');
  });

  it('debería manejar timeout', async () => {
    // El cliente distingue el timeout por `error.name === 'AbortError'`, y
    // `new Error('AbortError')` solo pone ese texto en el mensaje: name sigue
    // siendo 'Error'. Un abort real es un DOMException con ese name.
    mockFetch.mockRejectedValueOnce(
      new DOMException('The operation was aborted', 'AbortError')
    );

    const repository = new HubSpotLeadRepository('test-token', 'https://api.hubapi.com', 50);

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await repository.guardar(lead);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});

describe('PipedriveLeadRepository', () => {
  let repository: PipedriveLeadRepository;

  beforeEach(() => {
    repository = new PipedriveLeadRepository('test-token', 'https://api.pipedrive.com/v1', 5000);
    vi.clearAllMocks();
  });

  it('debería guardar un lead exitosamente', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 67890 } }),
    });

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await repository.guardar(lead);

    expect(result.success).toBe(true);
    expect(result.crmRecordId).toBe('67890');
  });
});

describe('SlackNotifier', () => {
  let notifier: SlackNotifier;

  beforeEach(() => {
    notifier = new SlackNotifier('https://hooks.slack.com/test', '#leads-sighfood', 3000);
    vi.clearAllMocks();
  });

  it('debería enviar notificación sin lanzar error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const notification = {
      leadEstablecimiento: 'Bar Test',
      leadWhatsapp: '+573001234567',
      leadCiudad: 'Medellín',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
    };

    // No debe lanzar error (fire-and-forget)
    await expect(notifier.notifyNewLead(notification)).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('debería manejar fallo de Slack silenciosamente', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const notification = {
      leadEstablecimiento: 'Bar Test',
      leadWhatsapp: '+573001234567',
      leadCiudad: 'Medellín',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
    };

    await expect(notifier.notifyNewLead(notification)).resolves.not.toThrow();
  });
});

describe('IntegrationOrchestrator', () => {
  it('debería procesar lead con CRM y notificaciones en paralelo', async () => {
    const mockCrm = {
      guardar: vi.fn().mockResolvedValue({ success: true, crmRecordId: '123' }),
    };

    const mockSlack = {
      notifyNewLead: vi.fn().mockResolvedValue(undefined),
    };

    // Dobles parciales: solo implementan los métodos que ejercita este test.
    const orchestrator = new IntegrationOrchestrator(
      mockCrm as unknown as LeadRepository,
      mockSlack as unknown as SlackNotifier
    );

    const lead = {
      establecimiento: 'Bar Test',
      whatsapp: '+573001234567',
      ciudad: 'Medellín',
      idempotencyKey: 'pilot:+573001234567:2026-08-05',
      timestamp: Date.now(),
    };

    const result = await orchestrator.processLead(lead);

    expect(result.crm.success).toBe(true);
    expect(result.slack.success).toBe(true);
    expect(mockCrm.guardar).toHaveBeenCalledTimes(1);
    expect(mockSlack.notifyNewLead).toHaveBeenCalledTimes(1);
  });
});