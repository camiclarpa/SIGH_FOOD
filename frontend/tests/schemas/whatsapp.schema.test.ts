/**
 * tests/schemas/whatsapp.schema.test.ts
 *
 * Tests del esquema de validación de WhatsApp E.164.
 * Verifica que el regex rechace formatos locales sin código de país.
 */
import { describe, it, expect } from 'vitest';
import { WhatsAppE164Schema } from '../../src/schemas/whatsapp.schema';

describe('WhatsAppE164Schema', () => {
  describe('casos válidos', () => {
    const validos = [
      '+573001234567',   // Colombia - 13 dígitos con +
      '+57300123456',    // Colombia - 12 dígitos con +
      '+12125551234',    // USA - 11 dígitos con +
      '+442071838750',   // UK - 12 dígitos con +
    ];

    validos.forEach((whatsapp) => {
      it(`debería aceptar ${whatsapp}`, () => {
        const resultado = WhatsAppE164Schema.safeParse(whatsapp);
        expect(resultado.success).toBe(true);
      });
    });
  });

  describe('casos inválidos', () => {
    const invalidos = [
      { valor: '3001234567', razon: 'sin código de país' },
      { valor: '+57 300 123 4567', razon: 'con espacios' },
      { valor: '+57-300-123-4567', razon: 'con guiones' },
      { valor: '300123456', razon: 'muy corto (9 dígitos)' },
      { valor: '+5730012345678901', razon: 'muy largo (14 dígitos)' },
      { valor: '', razon: 'vacío' },
      { valor: 'abc', razon: 'no numérico' },
      { valor: '+abc123', razon: 'caracteres alfabéticos' },
    ];

    invalidos.forEach(({ valor, razon }) => {
      it(`debería rechazar "${valor}" (${razon})`, () => {
        const resultado = WhatsAppE164Schema.safeParse(valor);
        expect(resultado.success).toBe(false);
      });
    });
  });

  describe('mensaje de error personalizado', () => {
    it('debería mostrar el mensaje de error en español', () => {
      const resultado = WhatsAppE164Schema.safeParse('3001234567');
      if (!resultado.success) {
        expect(resultado.error.issues[0].message).toBe(
          'El WhatsApp debe incluir el código de país, ej: +573001234567'
        );
      }
    });
  });
});