/**
 * types/browser-apis.d.ts
 *
 * Declaraciones para APIs de navegador que TypeScript no incluye en `lib.dom`:
 * unas por experimentales (Network Information, Device Memory, Background Sync)
 * y otras porque las inyecta un script de terceros en tiempo de ejecución
 * (Datadog RUM).
 *
 * Todas se declaran opcionales a propósito: el código debe seguir comprobando
 * su existencia antes de usarlas, que es justo lo que perdíamos con `as any`.
 */

/**
 * Network Information API.
 * https://developer.mozilla.org/docs/Web/API/NetworkInformation
 */
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly type?: string;
  readonly downlink?: number;
  readonly rtt?: number;
  readonly saveData?: boolean;
}

interface Navigator {
  /** Network Information API (Chromium). */
  readonly connection?: NetworkInformation;
  /** Prefijo histórico de Firefox. */
  readonly mozConnection?: NetworkInformation;
  /** Prefijo histórico de WebKit. */
  readonly webkitConnection?: NetworkInformation;
  /** Device Memory API: RAM aproximada del dispositivo en GiB. */
  readonly deviceMemory?: number;
}

/**
 * Background Sync API.
 * https://developer.mozilla.org/docs/Web/API/SyncManager
 */
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync?: SyncManager;
}

interface Window {
  /** Datadog Real User Monitoring, inyectado por el snippet del proveedor. */
  datadogRum?: {
    addAction(nombre: string, contexto?: Record<string, unknown>): void;
  };
}
