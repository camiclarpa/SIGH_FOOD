/**
 * domain/leads/WhatsAppE164.ts
 *
 * Tipo de marca (branded type) para forzar, a nivel de tipo, que un
 * WhatsApp ya fue validado en formato E.164 (ej. +573001234567) antes de
 * construirse — evita que un string sin validar se pase por error a una
 * función que espera un WhatsApp ya verificado.
 */
export type WhatsAppE164 = string & { readonly __brand: 'WhatsAppE164' };

/**
 * Type guard — única forma permitida de producir un WhatsAppE164 válido.
 * Formato: + seguido de 10 a 13 dígitos (código de país + número).
 */
export function esWhatsAppE164Valido(valor: string): valor is WhatsAppE164 {
  return /^\+[0-9]{10,13}$/.test(valor);
}