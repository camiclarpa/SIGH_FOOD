/**
 * schemas/whatsapp.schema.ts
 *
 * Regex E.164: '+' seguido de 10 a 13 dígitos. Rechaza formatos locales
 * sin código de país (ej. "3001234567" sin el "+57" se rechaza
 * explícitamente, forzando al usuario a confirmar el código de país).
 */
import { z } from 'zod';

export const WhatsAppE164Schema = z
  .string()
  .regex(/^\+[0-9]{10,13}$/, 'El WhatsApp debe incluir el código de país, ej: +573001234567');