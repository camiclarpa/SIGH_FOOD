/**
 * lib/resiliency/backgroundSync.ts
 *
 * Estrategia B: Registro de Background Sync (Para Cuando la Pestaña se Cierra)
 * RFC-003 Sección 3.2.1
 *
 * Objetivo: si el usuario cierra la pestaña antes de que los reintentos en
 * foreground (retryQueue.ts) tengan éxito, el Service Worker sigue
 * intentando enviar el Lead en segundo plano — incluso si el navegador
 * está cerrado, el SO puede despertar el Service Worker cuando haya
 * conectividad disponible.
 *
 * FMEA cubierto:
 *   - F5 (Cierre de pestaña antes de completar reintento): el Service Worker
 *     continúa los reintentos aunque el usuario cierre la pestaña
 *   - F6 (Navegador sin soporte de Background Sync): detección explícita
 *     con fallback a Estrategia C (WhatsApp)
 *
 * Limitación técnica importante (RFC-003 Nota técnica):
 *   Un Service Worker NO tiene acceso directo a localStorage — solo al
 *   hilo principal. Por eso, cuando se registra el Background Sync,
 *   debemos migrar el registro pendiente de LocalStorage a IndexedDB,
 *   que sí es accesible desde el Service Worker.
 *
 * Soporte de navegadores ( caniuse.com/background-sync ):
 *   - Chrome/Edge: soporte completo desde 2016
 *   - Firefox: soporte completo desde 2021
 *   - Safari/iOS: soporte PARCIAL desde iOS 17.4 (marzo 2024) — por eso
 *     la detección explícita con soportaBackgroundSync() es crítica
 */

/**
 * Detecta si el navegador soporta Background Sync API.
 *
 * Verificación doble:
 *   1. 'serviceWorker' in navigator — el navegador soporta Service Workers
 *   2. 'SyncManager' in window — el navegador soporta Background Sync
 *
 * Ambos deben ser true para que Background Sync funcione. Safari/iOS
 * tiene Service Workers pero NO SyncManager (hasta iOS 17.4), por eso
 * esta función retorna false en ese caso — cubriendo F6 del FMEA.
 *
 * @returns true si el navegador soporta Background Sync, false en caso contrario
 */
export function soportaBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Registra un reintento en segundo plano para el Lead especificado.
 *
 * Flujo:
 *   1. Verificar soporte de Background Sync
 *   2. Esperar a que el Service Worker esté listo (navigator.serviceWorker.ready)
 *   3. Registrar un sync tag único: `sync-lead-${leadId}`
 *   4. El Service Worker recibirá el evento 'sync' con ese tag y reenviará
 *      el Lead desde IndexedDB (ver public/sw.js)
 *
 * Nota: el tag debe ser único por Lead para que el Service Worker sepa
 * cuál Lead reenviar. El formato `sync-lead-${leadId}` permite al SW
 * extraer el leadId del tag y buscar el registro en IndexedDB.
 *
 * @param leadId - UUID del Lead que necesita reintento en segundo plano
 * @returns true si el registro fue exitoso, false si no hay soporte o falló
 */
export async function registrarReintentoEnSegundoPlano(
  leadId: string
): Promise<boolean> {
  if (!soportaBackgroundSync()) {
    return false; // El llamador debe escalar directamente a Estrategia C
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.sync) {
      return false;
    }
    await registration.sync.register(`sync-lead-${leadId}`);
    return true;
  } catch {
    // Fallo al registrar — puede ser por permisos, Service Worker no registrado,
    // o cualquier otra razón. El llamador debe escalar a Estrategia C.
    return false;
  }
}

/**
 * Migra un registro pendiente de LocalStorage a IndexedDB.
 *
 * Necesario porque el Service Worker no puede acceder a localStorage —
 * solo a IndexedDB. Esta función se llama ANTES de registrar el
 * Background Sync, para que el SW pueda leer el registro cuando se
 * dispare el evento 'sync'.
 *
 * Implementación simplificada: en producción, usar una librería como
 * idb (https://github.com/jakearchibald/idb) para manejar IndexedDB
 * de forma más ergonomica.
 *
 * @param record - El registro del Lead pendiente a migrar
 * @returns true si la migración fue exitosa, false en caso contrario
 */
export async function migrarAIndexedDB(
  record: PendingLeadRecord
): Promise<boolean> {
  try {
    const db = await abrirBaseDeDatos();
    const tx = db.transaction('pending_leads', 'readwrite');
    const store = tx.objectStore('pending_leads');
    await store.put(record, record.leadId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Abre (o crea) la base de datos IndexedDB para Leads pendientes.
 *
 * Schema:
 *   - Base de datos: 'sighfood_resiliency'
 *   - Object store: 'pending_leads'
 *   - Key path: 'leadId' (string, UUID v4)
 *
 * @returns Instancia de IDBDatabase lista para usar
 */
function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sighfood_resiliency', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pending_leads')) {
        db.createObjectStore('pending_leads', { keyPath: 'leadId' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Importación de tipos necesaria para la migración
import type { PendingLeadRecord } from './localLeadStorage';
