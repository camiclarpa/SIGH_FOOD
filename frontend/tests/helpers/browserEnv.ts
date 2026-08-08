/**
 * tests/helpers/browserEnv.ts
 *
 * Utilidades para simular capacidades del navegador en los tests.
 *
 * Por qué existe: varios tests hacían
 *   Object.defineProperty(globalThis, 'window', { value: { SyncManager: {} } })
 * que NO parchea una capacidad — reemplaza el `window` de jsdom por un objeto
 * pelado. Eso deja a React sin DOM y `renderHook` devuelve `result.current`
 * null, de modo que el test falla por un motivo que no tiene nada que ver con
 * lo que pretende comprobar.
 *
 * Estos helpers añaden y quitan solo la propiedad concreta, dejando intacto el
 * resto del entorno.
 */

type Mutable = Record<string, unknown>;

/** Instala un doble de `navigator.serviceWorker` (jsdom no lo implementa). */
export function instalarServiceWorker(mock: unknown): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: mock,
    configurable: true,
    writable: true,
  });
}

/** Simula un navegador sin Service Workers. */
export function quitarServiceWorker(): void {
  delete (navigator as unknown as Mutable).serviceWorker;
}

/** Marca Background Sync como disponible (`'SyncManager' in window`). */
export function instalarSyncManager(): void {
  (window as unknown as Mutable).SyncManager = class SyncManager {};
}

/** Simula Safari/iOS anterior a 17.4: Service Worker sí, SyncManager no. */
export function quitarSyncManager(): void {
  delete (window as unknown as Mutable).SyncManager;
}

/** Adjunta un SDK de observabilidad (Sentry, analytics) a `window`. */
export function instalarGlobalDeVentana(nombre: string, valor: unknown): void {
  (window as unknown as Mutable)[nombre] = valor;
}

/** Quita un global previamente adjuntado a `window`. */
export function quitarGlobalDeVentana(nombre: string): void {
  delete (window as unknown as Mutable)[nombre];
}

/** Deja el entorno como estaba: sin service worker, sin SyncManager. */
export function limpiarCapacidadesDelNavegador(): void {
  quitarServiceWorker();
  quitarSyncManager();
}

/**
 * Ejecuta una operación que espera el backoff de reintentos (2s + 4s + 8s)
 * adelantando el reloj en vez de esperarlo.
 *
 * Sin esto, un `await reintentarConBackoff(...)` tarda 14 segundos reales y
 * supera el límite de 5s por test de Vitest — el test falla por lentitud, no
 * porque el código esté mal.
 */
export async function conRelojAdelantado<T>(
  operacion: () => Promise<T>,
  msAAvanzar = 20_000
): Promise<T> {
  const { vi } = await import('vitest');
  vi.useFakeTimers();
  try {
    const promesa = operacion();
    await vi.advanceTimersByTimeAsync(msAAvanzar);
    return await promesa;
  } finally {
    vi.useRealTimers();
  }
}
