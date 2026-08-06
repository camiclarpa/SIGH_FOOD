/**
 * lib/resiliency/retryQueue.ts
 *
 * Estrategia B: Reintentos Asíncronos con backoff exponencial
 * RFC-003 Sección 3.2
 *
 * Objetivo: una vez el Lead está seguro en LocalStorage (Estrategia A),
 * reintentar el envío con backoff exponencial mientras la pestaña sigue
 * abierta — y, si el usuario cierra la pestaña antes de tener éxito,
 * delegar el reintento al Service Worker vía Background Sync API.
 *
 * FMEA cubierto:
 *   - F1 (Timeout de API): reintentos automáticos transparentes al usuario
 *   - F3 (Pérdida total de conexión): los reintentos esperan reconexión
 *   - F5 (Cierre de pestaña): cubierto por backgroundSync.ts (siguiente archivo)
 *
 * Principio de diseño:
 *   - 3 intentos máximo en foreground (2s, 4s, 8s = ~14s total)
 *   - Cada intento con timeout de 5s (AbortSignal.timeout) para no esperar
 *     indefinidamente si la red está caída pero el fetch no falla rápido
 *   - Si los 3 intentos fallan, retornar 'exhausted' para que el llamador
 *     escale a Background Sync o Estrategia C (WhatsApp)
 */
import {
  guardarLeadPendiente,
  obtenerLeadsPendientes,
  actualizarIntentosDeReintento,
  marcarComoSincronizado as marcarSincronizadoStorage,
  type PendingLeadRecord,
} from './localLeadStorage';

/**
 * Secuencia de backoff exponencial — 3 intentos: 2s, 4s, 8s.
 * Total máximo de espera en foreground: ~14 segundos.
 *
 * Justificación (RFC-003 Sección 1.2):
 *   "Tiempo de reintento en segundo plano antes de escalar al fallback
 *    de WhatsApp: Máximo 3 intentos, ventana total ~15 segundos"
 *
 * Balance entre dar oportunidad a una reconexión de red breve y no hacer
 * esperar indefinidamente a un usuario con un problema de conectividad
 * persistente.
 */
const BACKOFF_SECUENCIA_MS: number[] = [2000, 4000, 8000];

/**
 * Timeout máximo por cada intento individual — 5 segundos.
 * Si la red está caída pero el fetch no falla rápido (caso común en
 * móviles con señal débil), no queremos esperar más de 5s por intento.
 */
const TIMEOUT_POR_INTENTO_MS = 5000;

/**
 * Resultado posible del reintento.
 * - 'success': el Lead se sincronizó exitosamente con el servidor
 * - 'exhausted': los 3 intentos en foreground fallaron — el llamador
 *   debe escalar a Background Sync o Estrategia C (WhatsApp)
 */
export type ResultadoReintento = 'success' | 'exhausted';

/**
 * Intenta reenviar el Lead al servidor con backoff exponencial.
 *
 * Flujo:
 *   1. Para cada intento en la secuencia de backoff:
 *      a. Esperar el tiempo correspondiente
 *      b. Actualizar metadatos de reintento en LocalStorage
 *      c. Intentar POST a /api/v1/leads/phygital-demo-request
 *      d. Si 202 Accepted → marcar como sincronizado y retornar 'success'
 *      e. Si error de red o 5xx → continuar al siguiente intento
 *      f. Si 4xx (error de validación del servidor) → abortar reintentos
 *   2. Si todos los intentos fallan → retornar 'exhausted'
 *
 * Nota: usamos X-Idempotency-Key (leadId) para que reintentos duplicados
 * no generen Leads duplicados en el servidor (RFC-002 Sección 7.1).
 *
 * @param record - El registro del Lead pendiente a reintentar
 * @returns 'success' si se sincronizó, 'exhausted' si se agotaron los intentos
 */
export async function reintentarConBackoff(
  record: PendingLeadRecord
): Promise<ResultadoReintento> {
  for (let intento = 0; intento < BACKOFF_SECUENCIA_MS.length; intento++) {
    const delayMs = BACKOFF_SECUENCIA_MS[intento];

    // Esperar el tiempo de backoff antes del intento
    await esperar(delayMs);

    // Actualizar metadatos de reintento en LocalStorage
    actualizarIntentosDeReintento(record.leadId, intento + 1);

    try {
      const response = await fetch('/api/v1/leads/phygital-demo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': record.leadId,
        },
        body: JSON.stringify(record.payload),
        signal: AbortSignal.timeout(TIMEOUT_POR_INTENTO_MS),
      });

      if (response.status === 202) {
        // Éxito — marcar como sincronizado y limpiar LocalStorage
        marcarComoSincronizado(record.leadId);
        return 'success';
      }

      // 4xx: error de validación del servidor — no reintentar, es un error
      // definitivo del payload (no de red). Escalar inmediatamente.
      if (response.status >= 400 && response.status < 500) {
        return 'exhausted';
      }

      // 5xx: error del servidor — continuar al siguiente intento del backoff
    } catch (error) {
      // Error de red (fetch falló) o timeout — continuar al siguiente intento
      // No logueamos aquí para no saturar la consola con errores esperados
    }
  }

  // Los 3 intentos en foreground fallaron — escalar (Sección 3.2.1)
  return 'exhausted';
}

/**
 * Marca un Lead como sincronizado exitosamente, removiéndolo de la lista
 * de pendientes en LocalStorage.
 *
 * Se llama después de recibir 202 Accepted del servidor, tanto en el
 * intento primario como en los reintentos.
 *
 * @param leadId - UUID del Lead que se sincronizó
 */
function marcarComoSincronizado(leadId: string): void {
  marcarSincronizadoStorage(leadId);
}

/**
 * Helper para esperar un tiempo determinado — abstrae setTimeout en una Promise.
 *
 * @param ms - Milisegundos a esperar
 * @returns Promise que se resuelve después del tiempo especificado
 */
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Obtiene todos los Leads pendientes de sincronización.
 *
 * Exportado para uso en tests y en el Service Worker (que necesita leer
 * los registros pendientes desde IndexedDB).
 *
 * @returns Array de registros pendientes (vacío si no hay ninguno)
 */
export { obtenerLeadsPendientes };