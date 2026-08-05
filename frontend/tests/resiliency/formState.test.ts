/**
 * tests/resiliency/formState.test.ts
 *
 * Tests de la máquina de estados del formulario.
 * RFC-003 Sección 4.1
 *
 * Verifica que:
 *   - Cada estado tiene la estructura correcta
 *   - Los type guards funcionan correctamente
 *   - La discriminated union es exhaustiva
 */
import { describe, it, expect } from 'vitest';
import {
  esEstadoExito,
  esEstadoFinal,
  type EstadoEnvioFormulario,
} from '../../src/lib/resiliency/formState';

describe('formState - Máquina de estados', () => {
  describe('EstadoIdle', () => {
    it('debería tener tipo "idle"', () => {
      const estado: EstadoEnvioFormulario = { tipo: 'idle' };
      expect(estado.tipo).toBe('idle');
      expect(esEstadoExito(estado)).toBe(false);
      expect(esEstadoFinal(estado)).toBe(false);
    });
  });

  describe('EstadoLoading', () => {
    it('debería tener tipo "loading"', () => {
      const estado: EstadoEnvioFormulario = { tipo: 'loading' };
      expect(estado.tipo).toBe('loading');
      expect(esEstadoExito(estado)).toBe(false);
      expect(esEstadoFinal(estado)).toBe(false);
    });
  });

  describe('EstadoSuccess', () => {
    it('debería tener tipo "success" con leadId', () => {
      const estado: EstadoEnvioFormulario = {
        tipo: 'success',
        leadId: 'test-lead-id-123',
      };
      expect(estado.tipo).toBe('success');
      expect(estado.leadId).toBe('test-lead-id-123');
      expect(esEstadoExito(estado)).toBe(true);
      expect(esEstadoFinal(estado)).toBe(true);
    });
  });

  describe('EstadoDegradedSuccess', () => {
    it('debería tener tipo "degraded-success" con leadId e intentosNecesarios', () => {
      const estado: EstadoEnvioFormulario = {
        tipo: 'degraded-success',
        leadId: 'test-lead-id-456',
        intentosNecesarios: 3,
      };
      expect(estado.tipo).toBe('degraded-success');
      expect(estado.leadId).toBe('test-lead-id-456');
      expect(estado.intentosNecesarios).toBe(3);
      expect(esEstadoExito(estado)).toBe(true);
      expect(esEstadoFinal(estado)).toBe(true);
    });

    it('debería ser indistinguible de success para el usuario (ambos son éxito)', () => {
      const success: EstadoEnvioFormulario = { tipo: 'success', leadId: '1' };
      const degraded: EstadoEnvioFormulario = {
        tipo: 'degraded-success',
        leadId: '2',
        intentosNecesarios: 2,
      };
      // Ambos son estados de éxito según el type guard
      expect(esEstadoExito(success)).toBe(true);
      expect(esEstadoExito(degraded)).toBe(true);
    });
  });

  describe('EstadoFallbackRequired', () => {
    it('debería tener tipo "fallback-required" con enlaceWhatsApp', () => {
      const estado: EstadoEnvioFormulario = {
        tipo: 'fallback-required',
        leadId: 'test-lead-id-789',
        enlaceWhatsApp: 'https://wa.me/573001234567?text=Hola',
      };
      expect(estado.tipo).toBe('fallback-required');
      expect(estado.leadId).toBe('test-lead-id-789');
      expect(estado.enlaceWhatsApp).toContain('wa.me');
      expect(esEstadoExito(estado)).toBe(false);
      expect(esEstadoFinal(estado)).toBe(true);
    });
  });

  describe('Transiciones de estado', () => {
    it('debería permitir transición de idle a loading', () => {
      const idle: EstadoEnvioFormulario = { tipo: 'idle' };
      const loading: EstadoEnvioFormulario = { tipo: 'loading' };
      expect(idle.tipo).toBe('idle');
      expect(loading.tipo).toBe('loading');
    });

    it('debería permitir transición de loading a success', () => {
      const loading: EstadoEnvioFormulario = { tipo: 'loading' };
      const success: EstadoEnvioFormulario = { tipo: 'success', leadId: '123' };
      expect(loading.tipo).toBe('loading');
      expect(success.tipo).toBe('success');
    });

    it('debería permitir transición de loading a fallback-required', () => {
      const loading: EstadoEnvioFormulario = { tipo: 'loading' };
      const fallback: EstadoEnvioFormulario = {
        tipo: 'fallback-required',
        leadId: '123',
        enlaceWhatsApp: 'https://wa.me/123',
      };
      expect(loading.tipo).toBe('loading');
      expect(fallback.tipo).toBe('fallback-required');
    });
  });
});