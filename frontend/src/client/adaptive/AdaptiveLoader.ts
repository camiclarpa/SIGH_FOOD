/**
 * ============================================================================
 * ADAPTIVE LOADER - Estrategia de Carga Adaptativa
 * RFC-001: System Architecture & Topology - Capa Cliente
 * ============================================================================
 * 
 * FUNCIÓN: Coordinar la detección de conexión y hardware para determinar
 * qué recursos cargar (video vs imagen estática) según las capacidades
 * del dispositivo y la conexión del usuario.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.1: "Estrategia de carga adaptativa - sirve imagen estática
 *   en vez de video Hero si la conexión es 3G o inferior"
 * 
 * LÓGICA DE DECISIÓN:
 *   1. Detectar tipo de conexión (ConnectionDetector)
 *   2. Detectar capacidades del dispositivo (HardwareDetector)
 *   3. Combinar ambos factores para determinar estrategia óptima
 *   4. Escuchar cambios en tiempo real (para SPA)
 * 
 * USO:
 *   const loader = new AdaptiveLoader();
 *   const resources = loader.getResourcesToLoad();
 *   // resources = { heroVideo: false, heroImage: true, animations: false }
 * ============================================================================
 */

import { ConnectionDetector } from '../connection/ConnectionDetector';
import { HardwareDetector } from '../hardware/HardwareDetector';

export interface ResourceLoadStrategy {
  heroVideo: boolean;
  heroImage: boolean;
  animations: boolean;
  lazyLoadImages: boolean;
  preloadFonts: boolean;
}

export class AdaptiveLoader {
  private connectionDetector: ConnectionDetector;
  private hardwareDetector: HardwareDetector;

  constructor() {
    this.connectionDetector = new ConnectionDetector();
    this.hardwareDetector = new HardwareDetector();
  }

  /**
   * Determina qué recursos cargar basado en conexión y hardware
   */
  getResourcesToLoad(): ResourceLoadStrategy {
    const connectionStrategy = this.connectionDetector.getAdaptiveStrategy();
    const deviceCapabilities = this.hardwareDetector.getDeviceCapabilities();

    // Estrategia conservadora: el factor más limitante decide
    const isLowEndDevice = deviceCapabilities.isLowEnd;
    const isSlowConnection = connectionStrategy !== 'video';

    // Video Hero: solo si conexión buena Y dispositivo capaz
    const shouldLoadVideo = connectionStrategy === 'video' && deviceCapabilities.canHandleVideo;

    // Imagen Hero: siempre cargar (fallback o principal)
    const shouldLoadImage = true;

    // Animaciones: desactivar en dispositivos low-end o conexión lenta
    const shouldLoadAnimations = !isLowEndDevice && !isSlowConnection;

    // Lazy loading: activar en conexión lenta para priorizar contenido crítico
    const shouldLazyLoad = isSlowConnection;

    // Preload de fuentes: solo en conexión buena
    const shouldPreloadFonts = connectionStrategy === 'video';

    return {
      heroVideo: shouldLoadVideo,
      heroImage: shouldLoadImage,
      animations: shouldLoadAnimations,
      lazyLoadImages: shouldLazyLoad,
      preloadFonts: shouldPreloadFonts,
    };
  }

  /**
   * Versión simplificada: ¿deberíamos cargar el video Hero?
   */
  shouldLoadHeroVideo(): boolean {
    return this.getResourcesToLoad().heroVideo;
  }

  /**
   * Escucha cambios en conexión y hardware (útil para SPA)
   */
  watchForChanges(callback: (strategy: ResourceLoadStrategy) => void): () => void {
    // Escuchar cambios de conexión
    const cleanupConnection = this.connectionDetector.onConnectionChange(() => {
      callback(this.getResourcesToLoad());
    });

    // Nota: no hay evento estándar para cambios de hardware
    // En una implementación real, podrías hacer polling periódico

    return () => {
      cleanupConnection();
    };
  }

  /**
   * Obtiene un resumen legible de la estrategia actual (para debugging)
   */
  getStrategySummary(): string {
    const resources = this.getResourcesToLoad();
    const connection = this.connectionDetector.getConnectionInfo();
    const hardware = this.hardwareDetector.getDeviceCapabilities();

    return `
Adaptive Load Strategy:
  Connection: ${connection.type} (RTT: ${connection.rtt}ms, Downlink: ${connection.downlink}Mbps)
  Device: ${hardware.deviceType} (${hardware.cpuCores} cores, ${hardware.memoryGB}GB RAM)
  Performance Tier: ${hardware.performanceTier}
  
  Resources:
    - Hero Video: ${resources.heroVideo ? '✓' : ''}
    - Hero Image: ${resources.heroImage ? '✓' : '✗'}
    - Animations: ${resources.animations ? '✓' : '✗'}
    - Lazy Load: ${resources.lazyLoadImages ? '✓' : '✗'}
    - Preload Fonts: ${resources.preloadFonts ? '✓' : '✗'}
    `.trim();
  }
}

// Exportar instancia singleton
export const adaptiveLoader = new AdaptiveLoader();