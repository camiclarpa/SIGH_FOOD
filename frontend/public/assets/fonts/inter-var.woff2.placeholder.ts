/**
 * ============================================================================
 * FUENTE INTER VARIABLE - PLACEHOLDER (RFC-HPBN, Capítulo 6)
 * ============================================================================
 * 
 * INSTRUCCIONES PARA OBTENER LA FUENTE REAL:
 * ───────────────────────────────────────────────────────────────────────────
 * 1. Visita: https://rsms.me/inter/
 * 2. Descarga "Inter Variable" (formato WOFF2)
 * 3. Renombra el archivo a: inter-var.woff2
 * 4. Colócalo en: public/assets/fonts/inter-var.woff2
 * 
 * ALTERNATIVA (npm):
 *   npm install @fontsource-variable/inter
 *   Luego importa en tu layout.tsx:
 *   import '@fontsource-variable/inter';
 * 
 * PRINCIPIO APLICADO (Cap. 6):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea analiza cómo el navegador procesa HTML, imágenes y contenido
 * activo. El problema central: el navegador bloquea el render esperando
 * recursos no descubiertos a tiempo.
 * 
 * SOLUCIÓN:
 *   • Usar <link rel="preload"> para la fuente (ver PerformanceHead.tsx)
 *   • Usar font-display: swap para mostrar fallback inmediatamente
 *   • Usar fuentes del sistema como fallback (-apple-system, Roboto)
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 6: Client Software (Browser)
 *   • Capítulo 5.2: Patrones de Mejora → Parallel Processing
 *   • Principio 5.1.8: Caches Depend on Locality of Reference
 * ============================================================================
 */

// Este archivo es un placeholder. Reemplázalo con el archivo WOFF2 real.
// Ver instrucciones arriba.

export const INTER_FONT_URL = '/assets/fonts/inter-var.woff2';
export const INTER_FONT_FAMILY = "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";