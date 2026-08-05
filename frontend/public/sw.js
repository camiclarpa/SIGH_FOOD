/**
 * public/sw.js
 *
 * Service Worker para Background Sync
 * RFC-003 Sección 3.2.1
 *
 * Este Service Worker maneja el evento 'sync' disparado por el navegador
 * cuando hay conectividad disponible — incluso si el usuario ya cerró
 * la pestaña de la Landing.
 *
 * Flujo completo:
 *   1. El usuario envía el formulario → falla la red
 *   2. retryQueue.ts intenta 3 veces con backoff (2s, 4s, 8s)
 *   3. Si falla, backgroundSync.ts migra el Lead a IndexedDB y registra
 *      el sync tag `sync-lead-${leadId}`
 *   4. El navegador dispara el evento 'sync' cuando hay conectividad
 *   5. Este Service Worker recibe el evento, lee el Lead de IndexedDB,
 *      y lo reenvía al servidor
 *   6. Si tiene éxito, elimina el Lead de IndexedDB y notifica al cliente
 *      (si sigue abierto) vía postMessage
 *
 * Nota técnica importante:
 *   Los Service Workers NO tienen acceso a localStorage — solo al hilo
 *   principal. Por eso usamos IndexedDB como almacenamiento compartido
 *   entre el hilo principal y el Service Worker.
 *
 * Registro del Service Worker:
 *   Debe registrarse desde el hilo principal (layout.tsx o page.tsx):
 *
 *   if ('serviceWorker' in navigator) {
 *     navigator.serviceWorker.register('/sw.js');
 *   }
 */

/**
 * Event listener principal — maneja el evento 'sync' disparado por el
 * navegador cuando hay conectividad disponible.
 *
 * El tag del sync es `sync-lead-${leadId}` — extraemos el leadId del tag
 * para buscar el registro correspondiente en IndexedDB.
 */
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-lead-')) {
    event.waitUntil(reenviarLeadDesdeServiceWorker(event.tag));
  }
});

/**
 * Reenvía un Lead desde el Service Worker al servidor.
 *
 * Flujo:
 *   1. Extraer leadId del tag (`sync-lead-${leadId}` → `${leadId}`)
 *   2. Abrir IndexedDB y leer el registro pendiente
 *   3. POST a /api/v1/leads/phygital-demo-request con X-Idempotency-Key
 *   4. Si 202 Accepted → eliminar de IndexedDB y notificar al cliente
 *   5. Si falla → el navegador re-disparará el evento 'sync' más tarde
 *      (reintentos automáticos del navegador, típicamente 3 veces)
 *
 * @param tag - El tag del sync event (formato: `sync-lead-${leadId}`)
 */
async function reenviarLeadDesdeServiceWorker(tag) {
  const leadId = tag.replace('sync-lead-', '');

  try {
    const db = await abrirIndexedDB();
    const tx = db.transaction('pending_leads', 'readonly');
    const store = tx.objectStore('pending_leads');
    const record = await store.get(leadId);

    if (!record) {
      // El Lead ya fue sincronizado o no existe — no hacer nada
      return;
    }

    const response = await fetch('/api/v1/leads/phygital-demo-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': leadId,
      },
      body: JSON.stringify(record.payload),
    });

    if (response.status === 202) {
      // Éxito — eliminar de IndexedDB
      const txWrite = db.transaction('pending_leads', 'readwrite');
      const storeWrite = txWrite.objectStore('pending_leads');
      await storeWrite.delete(leadId);
      await txWrite.done;

      // Notificar al cliente si sigue abierto, para actualizar el estado visible
      // (Sección 4.3 del RFC-003: el estado degraded-success)
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'LEAD_SYNCED',
            leadId: leadId,
          });
        });
      });
    }
    // Si falla (4xx o 5xx), no eliminamos de IndexedDB — el navegador
    // re-disparará el evento 'sync' más tarde (reintentos automáticos)
  } catch (error) {
    // Error de red o IndexedDB — el navegador reintentará automáticamente
  }
}

/**
 * Abre la base de datos IndexedDB desde el Service Worker.
 *
 * Mismo schema que el definido en backgroundSync.ts:
 *   - Base de datos: 'sighfood_resiliency'
 *   - Object store: 'pending_leads'
 *   - Key path: 'leadId'
 *
 * @returns Instancia de IDBDatabase lista para usar
 */
async function abrirIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sighfood_resiliency', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_leads')) {
        db.createObjectStore('pending_leads', { keyPath: 'leadId' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Event listener para mensajes del cliente (hilo principal).
 *
 * Permite comunicación bidireccional entre el cliente y el Service Worker.
 * Por ejemplo, el cliente puede pedir al SW que limpie registros antiguos
 * o que fuerce un reintento inmediato.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_OLD_LEADS') {
    limpiarLeadsAntiguos(event.data.maxDias);
  }
});

/**
 * Limpia Leads pendientes que tienen más de N días sin sincronizar.
 *
 * Prevención de acumulación infinita de Leads en IndexedDB si el usuario
 * nunca vuelve a abrir la página.
 *
 * @param maxDias - Número máximo de días antes de purgar (default: 30)
 */
async function limpiarLeadsAntiguos(maxDias = 30) {
  try {
    const db = await abrirIndexedDB();
    const tx = db.transaction('pending_leads', 'readwrite');
    const store = tx.objectStore('pending_leads');
    const cutoff = Date.now() - maxDias * 24 * 60 * 60 * 1000;

    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const record = cursor.value;
        const primerIntento = new Date(record.primerIntentoISO).getTime();
        if (primerIntento < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    await tx.done;
  } catch (error) {
    // Fallo silencioso — no crítico
  }
}