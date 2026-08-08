/**
 * ============================================================================
 * CONNECTION DETECTOR - Detección de Tipo de Conexión
 * RFC-001: System Architecture & Topology - Capa Cliente
 * ============================================================================
 * 
 * FUNCIÓN: Detectar el tipo de conexión del usuario (4G/3G/WiFi) usando la
 * Network Information API para implementar carga adaptativa de recursos.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.1: "Estrategia de carga adaptativa - Detección de
 *   navigator.connection.effectiveType — sirve imagen estática en vez de
 *   video Hero si la conexión es 3G o inferior"
 * 
 * COMPATIBILIDAD:
 *   - Chrome/Edge: Soporte completo desde v61
 *   - Firefox: No soportado (fallback a 'unknown')
 *   - Safari: No soportado (fallback a 'unknown')
 *   - Mobile browsers: Soporte variable
 * 
 * USO:
 *   const detector = new ConnectionDetector();
 *   const strategy = detector.getAdaptiveStrategy();
 *   if (strategy === 'static-image') {
 *     // Servir imagen estática en vez de video
 *   }
 * ============================================================================
 */

export type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';

export type AdaptiveStrategy = 'video' | 'static-image' | 'minimal';

export interface ConnectionInfo {
  type: ConnectionType;
  effectiveType: string | undefined;
  downlink: number | undefined; // Mbps
  rtt: number | undefined; // ms
  saveData: boolean;
}

export class ConnectionDetector {
  private connection: NetworkInformation | null;

  constructor() {
    // Network Information API - solo disponible en algunos navegadores
    this.connection = typeof navigator !== 'undefined'
      ? navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection ?? null
      : null;
  }

  /**
   * Obtiene información completa de la conexión
   */
  getConnectionInfo(): ConnectionInfo {
    if (!this.connection) {
      return {
        type: 'unknown',
        effectiveType: undefined,
        downlink: undefined,
        rtt: undefined,
        saveData: false,
      };
    }

    return {
      type: this.mapConnectionType(this.connection.effectiveType),
      effectiveType: this.connection.effectiveType,
      downlink: this.connection.downlink,
      rtt: this.connection.rtt,
      saveData: this.connection.saveData || false,
    };
  }

  /**
   * Determina la estrategia de carga adaptativa basada en la conexión
   * 
   * Lógica de decisión:
   * - WiFi o 4G sin saveData: cargar video Hero completo
   * - 3G o saveData activado: cargar imagen estática
   * - 2G o slow-2g: cargar versión minimal (solo texto e iconos)
   */
  getAdaptiveStrategy(): AdaptiveStrategy {
    const info = this.getConnectionInfo();

    // Si el usuario activó "ahorro de datos", siempre usar versión ligera
    if (info.saveData) {
      return 'static-image';
    }

    // Clasificación por tipo de conexión
    switch (info.type) {
      case 'wifi':
      case '4g':
        return 'video';
      
      case '3g':
        // 3G es borderline - usar imagen estática para mejor UX
        return 'static-image';
      
      case '2g':
      case 'slow-2g':
        return 'minimal';
      
      case 'unknown':
      default:
        // Fallback conservador: asumir buena conexión pero no cargar video pesado
        return 'static-image';
    }
  }

  /**
   * Verifica si la conexión es suficiente para cargar video
   */
  canLoadVideo(): boolean {
    return this.getAdaptiveStrategy() === 'video';
  }

  /**
   * Escucha cambios en la conexión (útil para SPA)
   */
  onConnectionChange(callback: (info: ConnectionInfo) => void): () => void {
    if (!this.connection) {
      return () => {}; // No-op si la API no está disponible
    }

    const handler = () => {
      callback(this.getConnectionInfo());
    };

    const connection = this.connection;
    connection.addEventListener('change', handler);

    // Retornar función de cleanup
    return () => {
      connection.removeEventListener('change', handler);
    };
  }

  /**
   * Mapea el effectiveType a nuestro tipo de conexión estandarizado
   */
  private mapConnectionType(effectiveType: string | undefined): ConnectionType {
    if (!effectiveType) {
      return 'unknown';
    }

    const typeMap: Record<string, ConnectionType> = {
      'slow-2g': 'slow-2g',
      '2g': '2g',
      '3g': '3g',
      '4g': '4g',
    };

    return typeMap[effectiveType] || 'unknown';
  }
}

// Exportar instancia singleton para uso global
export const connectionDetector = new ConnectionDetector();