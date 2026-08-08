/**
 * ============================================================================
 * ADAPTIVE VIDEO — Detección de Conexión (RFC-HPBN, Capítulo 8)
 * ============================================================================
 * 
 * FUNCIÓN: Detectar la calidad de conexión del usuario y decidir si servir
 * video o imagen estática en el Hero Section.
 * 
 * PRINCIPIO APLICADO (Cap. 8):
 * ───────────────────────────────────────────────────────────────────────────
 * Killelea documenta que el hardware del cliente (CPU, RAM, GPU) limita el
 * rendimiento percibido independientemente de qué tan rápido sea el servidor.
 * En 2026, esto se traduce a: detectar la conexión real del usuario y
 * degradar el contenido si es necesario.
 * 
 * Caso de estudio adaptado (RFC-HPBN, Sección 4.2):
 *   "Gerente de A&B revisando el landing desde el sótano de un bar con
 *    señal 4G débil o WiFi saturado de eventos"
 * 
 * API utilizada: Network Information API (navigator.connection)
 *   • effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
 *   • saveData: boolean (usuario activó "ahorro de datos")
 * 
 * ESTRATEGIA:
 *   • Conexión buena (4g, sin saveData): servir video AV1 en loop
 *   • Conexión pobre (slow-2g, 2g, 3g, saveData): servir imagen estática
 *   • API no disponible: fallback conservador (asumir buena conexión)
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 8: Client Hardware
 *   • Capítulo 4, Caso de Estudio: "Network Connection Too Slow"
 *   • Principio 5.1.4: There Is No Free Lunch (video AV1 reduce peso pero
 *     exige más CPU de decodificación en dispositivos antiguos)
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • El cronómetro "0:19 segundos" (UNEXPECTED) debe mantenerse visible
 *     incluso en modo imagen estática para no perder el núcleo del mensaje
 * ============================================================================
 */

export type VideoStrategy = 'video' | 'static-image';

export function getAdaptiveVideoStrategy(): VideoStrategy {
  // Si no estamos en el navegador, asumir buena conexión (SSG)
  if (typeof navigator === 'undefined') {
    return 'video';
  }

  // La Network Information API no existe en Safari ni Firefox: sin ella,
  // asumimos buena conexión en lugar de degradar a imagen estática.
  const conn = navigator.connection;
  if (!conn) {
    return 'video';
  }

  // Detectar conexión lenta o ahorro de datos activado
  const slowConnection =
    conn.effectiveType === 'slow-2g' ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === '3g' ||
    conn.saveData === true;

  return slowConnection ? 'static-image' : 'video';
}

// Ejemplo de uso en el componente Hero:
// const strategy = getAdaptiveVideoStrategy();
// if (strategy === 'video') {
//   return <video src="/hero-cono.av1.mp4" autoPlay loop muted />;
// } else {
//   return <img src="/hero-cono-static.webp" alt="Cronómetro 0:19" />;
// }