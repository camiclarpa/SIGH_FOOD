/**
 * ============================================================================
 * IDEMPOTENCY KEY - Generación de Clave Única
 * RFC-001: Capa Backend (Sección 3.3)
 * RFC-DDIA: Sección 8.2 (Linealizabilidad)
 * ============================================================================
 * 
 * FUNCIÓN: Generar una clave única para deduplicar envíos de formulario.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.3: "idempotencyKey para deduplicación"
 * 
 * REFERENCIA RFC-DDIA:
 *   Sección 8.2: "Deduplicación de idempotency key — Dos envíos casi
 *   simultáneos del mismo formulario (doble clic del usuario) deben
 *   resolverse de forma linealizable dentro de la misma clave"
 * 
 * REFERENCIA RFC-HPBN:
 *   Sección 17.3: "Cola de Upstash Redis con Idempotency Key"
 * 
 * FÓRMULA:
 *   `pilot:${whatsapp}:${fecha}`
 * 
 * JUSTIFICACIÓN:
 *   - WhatsApp: identificador único del usuario
 *   - Fecha: permite múltiples envíos en días distintos (un usuario puede
 *     agendar múltiples demos)
 *   - TTL 24h: previene duplicados del mismo día
 * ============================================================================
 */

export class IdempotencyKeyGenerator {
  /**
   * Genera una clave única para un envío de formulario.
   * 
   * @param whatsapp - Número de WhatsApp del usuario
   * @param date - Fecha opcional (default: hoy)
   * @returns Clave única en formato `pilot:${whatsapp}:${YYYY-MM-DD}`
   */
  static generate(whatsapp: string, date: Date = new Date()): string {
    const fecha = date.toISOString().slice(0, 10); // YYYY-MM-DD
    return `pilot:${whatsapp}:${fecha}`;
  }

  /**
   * Valida el formato de una idempotency key.
   * 
   * @param key - Clave a validar
   * @returns true si el formato es válido
   */
  static isValid(key: string): boolean {
    const pattern = /^pilot:\+?[0-9]{10,13}:\d{4}-\d{2}-\d{2}$/;
    return pattern.test(key);
  }

  /**
   * Extrae el WhatsApp de una idempotency key.
   * 
   * @param key - Clave en formato válido
   * @returns Número de WhatsApp
   */
  static extractWhatsapp(key: string): string {
    const parts = key.split(':');
    if (parts.length !== 3 || parts[0] !== 'pilot') {
      throw new Error(`Formato de clave inválido: ${key}`);
    }
    return parts[1];
  }

  /**
   * Extrae la fecha de una idempotency key.
   * 
   * @param key - Clave en formato válido
   * @returns Fecha en formato Date
   */
  static extractDate(key: string): Date {
    const parts = key.split(':');
    if (parts.length !== 3 || parts[0] !== 'pilot') {
      throw new Error(`Formato de clave inválido: ${key}`);
    }
    return new Date(parts[2]);
  }
}