/**
 * Tests unitarios para LeadStateMachine
 * RFC-001: System Architecture & Topology (Fase 5)
 */

import { describe, it, expect } from 'vitest';
import { LeadStateMachine } from '../../src/domain/lead/LeadStateMachine';
import { crearLead } from '../../src/domain/lead/Lead';
import { LeadState } from '../../src/domain/states/LeadState';

describe('LeadStateMachine', () => {
  const leadInput = {
    establecimiento: 'Gastrobar El Rincón',
    tomadorDecision: { nombre: 'Carlos Rodríguez', rol: 'Gerente A&B' as const },
    whatsapp: '+573001234567',
    licoresDominantes: ['Mezcal', 'Gin'],
    ciudad: 'Medellín',
    idempotencyKey: 'pilot:+573001234567:2026-08-05',
  };

  describe('Flujo exitoso', () => {
    it('debería transicionar de RECIBIDO a SINCRONIZADO', () => {
      let lead = crearLead(leadInput);
      expect(lead.estado).toBe(LeadState.RECIBIDO);

      lead = LeadStateMachine.encolar(lead);
      expect(lead.estado).toBe(LeadState.ENCOLADO);

      lead = LeadStateMachine.procesar(lead);
      expect(lead.estado).toBe(LeadState.PROCESANDO);

      lead = LeadStateMachine.sincronizar(lead, 'crm-12345');
      expect(lead.estado).toBe(LeadState.SINCRONIZADO);
      expect(lead.crmRecordId).toBe('crm-12345');
    });

    it('debería registrar todas las transiciones en el historial', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);
      lead = LeadStateMachine.sincronizar(lead, 'crm-12345');

      expect(lead.historialTransiciones).toHaveLength(3);
      expect(lead.historialTransiciones[0].from).toBe(LeadState.RECIBIDO);
      expect(lead.historialTransiciones[0].to).toBe(LeadState.ENCOLADO);
    });
  });

  describe('Flujo con fallo', () => {
    it('debería transicionar a FALLIDO y luego a DLQ', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);

      lead = LeadStateMachine.fallar(lead, 'CRM timeout', 3);
      expect(lead.estado).toBe(LeadState.FALLIDO);
      expect(lead.intentosSincronizacion).toBe(3);

      lead = LeadStateMachine.moverADLQ(lead);
      expect(lead.estado).toBe(LeadState.DLQ);
    });

    it('debería permitir resolución manual desde DLQ', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);
      lead = LeadStateMachine.fallar(lead, 'CRM timeout', 3);
      lead = LeadStateMachine.moverADLQ(lead);

      lead = LeadStateMachine.resolverManualmente(lead);
      expect(lead.estado).toBe(LeadState.RESUELTO_MANUALMENTE);
    });
  });

  describe('Transiciones inválidas', () => {
    it('debería lanzar error al intentar transición inválida', () => {
      const lead = crearLead(leadInput);
      
      expect(() => {
        LeadStateMachine.procesar(lead); // No se puede procesar desde RECIBIDO
      }).toThrow();
    });

    it('debería lanzar error al intentar transicionar desde estado terminal', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);
      lead = LeadStateMachine.sincronizar(lead, 'crm-12345');

      expect(() => {
        LeadStateMachine.fallar(lead, 'error', 1); // No se puede fallar desde SINCRONIZADO
      }).toThrow();
    });
  });

  describe('Estados terminales', () => {
    it('debería identificar SINCRONIZADO como estado terminal', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);
      lead = LeadStateMachine.sincronizar(lead, 'crm-12345');

      expect(LeadStateMachine.esEstadoTerminal(lead)).toBe(true);
    });

    it('debería identificar RESUELTO_MANUALMENTE como estado terminal', () => {
      let lead = crearLead(leadInput);
      lead = LeadStateMachine.encolar(lead);
      lead = LeadStateMachine.procesar(lead);
      lead = LeadStateMachine.fallar(lead, 'error', 3);
      lead = LeadStateMachine.moverADLQ(lead);
      lead = LeadStateMachine.resolverManualmente(lead);

      expect(LeadStateMachine.esEstadoTerminal(lead)).toBe(true);
    });
  });
});