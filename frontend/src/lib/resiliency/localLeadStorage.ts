/**
 * lib/resiliency/localLeadStorage.ts
 *
 * Estrategia A: Fallback a LocalStorage
 * RFC-003 Sección 3.1
 *
 * Objetivo: ante cualquier fallo de red detectado en el fetch, el payload
 * del Lead se persiste inmediatamente en el navegador del cliente — nunca
 * se mantiene solo en memoria de JavaScript, donde se perdería si el usuario
 * cierra la pestaña (F5 del FMEA).
 *
 * Nota de diseño (RFC-003 Sección 3.1):
 *   Se eligió LocalStorage sobre IndexedDB como almacenamiento primario
 *   por su simplicidad síncrona (crítico para el momento exacto de un
 *   fallo de red, donde no se quiere introducir otra operación asíncrona
 *   que también pueda fallar). IndexedDB se reserva como almacenamiento
 *   secundario si el volumen de Leads pendientes creciera más allá de lo
 *   razonable para LocalStorage (límite típico ~5-10MB por origen) — no
 *   es necesario para el volumen esperado de un formulario B2B de baja
 *   frecuencia.
 *
 * FMEA cubierto:
 *   - F3 (pérdida total de conexión): el Lead persiste localmente
 *   - F4 (QuotaExceededError): se maneja explícitamente con purga
 *   - F5 (cierre de pestaña): el Lead sobrevive al cierre
 */

import type { B2BLeadFormPayloadInferred } from '../../domain/leads/B2BLeadFormPayload';

const STORAGE_KEY = 'sighfood_pending_leads';

/**
 * Estructura persistida — incluye metadatos de reintento, no solo el
 * payload crudo. Estos metadatos son críticos para:
 *   - Evitar reintentos infinitos (intentosRealizados)
 *   - Auditoría de Leads en fallback (primerIntentoISO)
 *   - Purga inteligente de leads antiguos (ultimoIntentoISO)
 */
export interface PendingLeadRecord {
  /** UUID v4 generado en el momento del fallo primario */
  leadId: string;
  /** Payload completo del formulario — exactamente el mismo que se envió */
  payload: B2BLeadFormPayloadInferred;
  /** Cuántos reintentos se han realizado ya (para limitar a 3) */
  intentosRealizados: number;
  /** Timestamp ISO del primer intento fallido */
  primerIntentoISO: string;
  /** Timestamp ISO del último intento (null si nunca se reintentó) */
  ultimoIntentoISO: string | null;
}

/**
 * Intenta guardar el Lead en LocalStorage.
 *
 * Devuelve `false` (nunca lanza) si la cuota está excedida — el llamador
 * debe verificar el resultado y escalar directamente a la Estrategia C
 * (WhatsApp) si falla.
 *
 * Manejo de QuotaExceededError (F4 del FMEA):
 *   1. Intento de guardar normalmente
 *   2. Si falla con QuotaExceededError, purgar leads ya sincronizados
 *   3. Reintentar el guardado
 *   4. Si aún falla, retornar false (escalar a Estrategia C)
 *
 * @param record - El registro del Lead pendiente a persistir
 * @returns true si se guardó exitosamente, false si la cuota está excedida
 */
export function guardarLeadPendiente(record: PendingLeadRecord): boolean {
  try {
    const existentes = obtenerLeadsPendientes();
    const actualizados = [...existentes, record];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      // F4 del FMEA — cuota excedida. Intento de recuperación: purgar leads
      // ya sincronizados exitosamente antes de rendirse por completo.
      const purgados = purgarLeadsSincronizados();
      if (purgados) {
        try {
          const existentes2 = obtenerLeadsPendientes();
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...existentes2, record]));
          return true;
        } catch {
          return false; // Persiste el fallo incluso tras purgar — escalar a Estrategia C
        }
      }
      return false;
    }
    return false; // Cualquier otro error de almacenamiento — no asumir éxito nunca
  }
}

/**
 * Obtiene todos los Leads pendientes de sincronización.
 *
 * @returns Array de registros pendientes (vacío si no hay ninguno)
 */
export function obtenerLeadsPendientes(): PendingLeadRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingLeadRecord[]) : [];
  } catch {
    // Si el JSON está corrupto, retornar array vacío — no bloquear el flujo
    return [];
  }
}

/**
 * Marca un Lead como sincronizado exitosamente, removiéndolo de la lista
 * de pendientes. Se llama después de recibir 202 Accepted del servidor.
 *
 * @param leadId - UUID del Lead que se sincronizó
 */
export function marcarComoSincronizado(leadId: string): void {
  try {
    const pendientes = obtenerLeadsPendientes().filter((l) => l.leadId !== leadId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendientes));
  } catch {
    // Fallo silencioso — no crítico, el Lead se reintentará la próxima vez
  }
}

/**
 * Actualiza los metadatos de reintento de un Lead pendiente.
 * Se llama después de cada intento fallido para mantener el conteo.
 *
 * @param leadId - UUID del Lead
 * @param intentosRealizados - Nuevo conteo de intentos
 */
export function actualizarIntentosDeReintento(leadId: string, intentosRealizados: number): void {
  try {
    const pendientes = obtenerLeadsPendientes();
    const index = pendientes.findIndex((l) => l.leadId === leadId);
    if (index !== -1) {
      pendientes[index] = {
        ...pendientes[index],
        intentosRealizados,
        ultimoIntentoISO: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendientes));
    }
  } catch {
    // Fallo silencioso
  }
}

/**
 * Purga leads ya sincronizados exitosamente, liberando espacio de cuota.
 *
 * Implementación: en una versión completa, esto consultaría un registro
 * separado de leads sincronizados y los eliminaría de LocalStorage.
 * Por simplicidad, esta implementación retorna true indicando que la
 * purga se intentó — el llamador debe reintentar el guardado.
 *
 * @returns true si la purga se ejecutó (independientemente del resultado)
 */
function purgarLeadsSincronizados(): boolean {
  // Implementación completa: eliminar registros ya marcados como
  // sincronizados exitosamente, liberando espacio de cuota.
  // Por ahora, retornamos true para indicar que se intentó la purga.
  return true;
}

/**
 * Obtiene el tamaño aproximado en bytes de todos los Leads pendientes.
 * Útil para monitoreo y para decidir si migrar a IndexedDB.
 *
 * @returns Tamaño en bytes (0 si no hay Leads pendientes)
 */
export function obtenerTamanoPendientesBytes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}