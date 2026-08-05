/**
 * Tests unitarios para IdempotencyKeyGenerator
 * RFC-001: Capa Backend de Ingesta Asíncrona
 */

import { describe, it, expect } from 'vitest';
import { IdempotencyKeyGenerator } from '../../src/queue/upstash/IdempotencyKey';

describe('IdempotencyKeyGenerator', () => {
  describe('generate()', () => {
    it('debería generar una clave única con formato correcto', () => {
      const key = IdempotencyKeyGenerator.generate('+573001234567', new Date('2026-08-05'));
      expect(key).toBe('pilot:+573001234567:2026-08-05');
    });

    it('debería usar la fecha de hoy si no se proporciona', () => {
      const today = new Date().toISOString().slice(0, 10);
      const key = IdempotencyKeyGenerator.generate('+573001234567');
      expect(key).toBe(`pilot:+573001234567:${today}`);
    });
  });

  describe('isValid()', () => {
    it('debería validar una clave correcta', () => {
      expect(IdempotencyKeyGenerator.isValid('pilot:+573001234567:2026-08-05')).toBe(true);
    });

    it('debería rechazar una clave con formato inválido', () => {
      expect(IdempotencyKeyGenerator.isValid('invalid-key')).toBe(false);
    });

    it('debería rechazar una clave sin prefijo pilot', () => {
      expect(IdempotencyKeyGenerator.isValid('test:+573001234567:2026-08-05')).toBe(false);
    });
  });

  describe('extractWhatsapp()', () => {
    it('debería extraer el WhatsApp de una clave válida', () => {
      const whatsapp = IdempotencyKeyGenerator.extractWhatsapp('pilot:+573001234567:2026-08-05');
      expect(whatsapp).toBe('+573001234567');
    });

    it('debería lanzar error para clave inválida', () => {
      expect(() => IdempotencyKeyGenerator.extractWhatsapp('invalid')).toThrow();
    });
  });

  describe('extractDate()', () => {
    it('debería extraer la fecha de una clave válida', () => {
      const date = IdempotencyKeyGenerator.extractDate('pilot:+573001234567:2026-08-05');
      expect(date.toISOString().slice(0, 10)).toBe('2026-08-05');
    });
  });
});