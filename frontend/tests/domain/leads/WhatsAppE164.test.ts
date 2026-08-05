/**
 * tests/domain/leads/WhatsAppE164.test.ts
 *
 * Tests del branded type WhatsAppE164 y su type guard.
 */
import { describe, it, expect } from 'vitest';
import { esWhatsAppE164Valido } from '../../../src/domain/leads/WhatsAppE164';

describe('esWhatsAppE164Valido (type guard)', () => {
  it('debería retornar true para WhatsApp válido con +57', () => {
    expect(esWhatsAppE164Valido('+573001234567')).toBe(true);
  });

  it('debería retornar true para WhatsApp válido con +1', () => {
    expect(esWhatsAppE164Valido('+12125551234')).toBe(true);
  });

  it('debería retornar false para número sin código de país', () => {
    expect(esWhatsAppE164Valido('3001234567')).toBe(false);
  });

  it('debería retornar false para número con espacios', () => {
    expect(esWhatsAppE164Valido('+57 300 123 4567')).toBe(false);
  });

  it('debería retornar false para string vacío', () => {
    expect(esWhatsAppE164Valido('')).toBe(false);
  });

  it('debería retornar false para número demasiado corto', () => {
    expect(esWhatsAppE164Valido('+57123')).toBe(false);
  });

  it('debería retornar false para número demasiado largo', () => {
    expect(esWhatsAppE164Valido('+5730012345678901')).toBe(false);
  });

  it('debería retornar false para caracteres no numéricos', () => {
    expect(esWhatsAppE164Valido('+57abc')).toBe(false);
  });
});