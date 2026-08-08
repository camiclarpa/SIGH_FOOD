/**
 * ============================================================================
 * HARDWARE DETECTOR - Detección de Capacidad del Dispositivo
 * RFC-001: System Architecture & Topology - Capa Cliente
 * ============================================================================
 * 
 * FUNCIÓN: Detectar las capacidades del dispositivo del usuario (CPU, memoria,
 * GPU) para implementar carga adaptativa de recursos pesados como video y
 * animaciones complejas.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.1: "Dispositivo objetivo: Móvil de gama media-baja, iOS/Android
 *   — el perfil predominante del Gerente de A&B/Head Bartender colombiano"
 * 
 * MÉTRICAS DETECTADAS:
 *   - Número de cores CPU (navigator.hardwareConcurrency)
 *   - Memoria del dispositivo (navigator.deviceMemory) - solo Chrome
 *   - Soporte de WebGL (indicador de capacidad GPU)
 *   - Tipo de dispositivo (mobile/desktop/tablet)
 * 
 * USO:
 *   const detector = new HardwareDetector();
 *   const capabilities = detector.getDeviceCapabilities();
 *   if (capabilities.isLowEnd) {
 *     // Desactivar animaciones complejas
 *   }
 * ============================================================================
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export type PerformanceTier = 'low' | 'medium' | 'high';

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number | undefined;
  hasWebGL: boolean;
  deviceType: DeviceType;
  performanceTier: PerformanceTier;
  isLowEnd: boolean;
  canHandleVideo: boolean;
  canHandleAnimations: boolean;
}

export class HardwareDetector {
  /**
   * Obtiene las capacidades completas del dispositivo
   */
  getDeviceCapabilities(): DeviceCapabilities {
    const cpuCores = this.getCpuCores();
    const memoryGB = this.getMemoryGB();
    const hasWebGL = this.checkWebGLSupport();
    const deviceType = this.detectDeviceType();
    const performanceTier = this.calculatePerformanceTier(cpuCores, memoryGB);

    return {
      cpuCores,
      memoryGB,
      hasWebGL,
      deviceType,
      performanceTier,
      isLowEnd: performanceTier === 'low',
      canHandleVideo: performanceTier !== 'low' && hasWebGL,
      canHandleAnimations: performanceTier !== 'low',
    };
  }

  /**
   * Verifica si el dispositivo puede manejar video Hero
   */
  canPlayHeroVideo(): boolean {
    const caps = this.getDeviceCapabilities();
    return caps.canHandleVideo && !caps.isLowEnd;
  }

  /**
   * Obtiene el número de cores CPU
   */
  private getCpuCores(): number {
    if (typeof navigator === 'undefined') {
      return 4; // Default conservador
    }
    return navigator.hardwareConcurrency || 4;
  }

  /**
   * Obtiene la memoria del dispositivo en GB (solo Chrome/Edge)
   */
  private getMemoryGB(): number | undefined {
    if (typeof navigator === 'undefined') {
      return undefined;
    }
    return navigator.deviceMemory;
  }

  /**
   * Verifica soporte de WebGL (indicador de capacidad GPU)
   */
  private checkWebGLSupport(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * Detecta el tipo de dispositivo basado en user agent y screen size
   */
  private detectDeviceType(): DeviceType {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return 'unknown';
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;

    // Detección por user agent
    if (/mobile|android|iphone|ipod/.test(userAgent)) {
      return 'mobile';
    }

    if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    }

    // Detección por tamaño de pantalla (fallback)
    if (screenWidth < 768) {
      return 'mobile';
    }

    if (screenWidth < 1024) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Calcula el tier de rendimiento basado en CPU y memoria
   */
  private calculatePerformanceTier(cpuCores: number, memoryGB: number | undefined): PerformanceTier {
    // Criterios para dispositivos de gama baja (perfil objetivo de SIGH_FOOD)
    const isLowCpu = cpuCores <= 2;
    const isLowMemory = memoryGB !== undefined && memoryGB <= 2;

    if (isLowCpu || isLowMemory) {
      return 'low';
    }

    // Criterios para dispositivos de gama alta
    const isHighCpu = cpuCores >= 6;
    const isHighMemory = memoryGB !== undefined && memoryGB >= 6;

    if (isHighCpu && isHighMemory) {
      return 'high';
    }

    // Todo lo demás es gama media
    return 'medium';
  }
}

// Exportar instancia singleton
export const hardwareDetector = new HardwareDetector();
