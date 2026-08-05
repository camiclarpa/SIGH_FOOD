/**
 * ============================================================================
 * ROI CALCULATOR WEB WORKER (RFC-HPBN, Capítulo 16)
 * ============================================================================
 * 
 * FUNCIÓN: Ejecutar el cálculo de ROI en un Web Worker para no bloquear
 * el hilo principal del navegador.
 * 
 * PRINCIPIO APLICADO (Cap. 16):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea documenta el costo de arranque de Java (15-20 segundos en 1998)
 * y cómo congelaba el navegador. En 2026, el problema equivalente es:
 * código JavaScript pesado ejecutándose en el hilo principal, congelando
 * la interactividad de la página.
 * 
 * Web Workers resuelven esto ejecutando cómputo fuera del hilo principal.
 * 
 * NOTA DE APLICACIÓN REAL (RFC-HPBN, Sección 16.3):
 *   Dado que calculateBarRoi es una función tan liviana (aritmética simple,
 *   sin I/O), un Web Worker es, en la práctica, más apropiado como
 *   demostración del principio que como necesidad estricta de rendimiento.
 *   Coherente con el Principio 5.1.5 (Returns Diminish): no vale la pena
 *   la complejidad de un Worker si el cálculo toma microsegundos en el
 *   hilo principal. Se documenta aquí como la solución correcta si la
 *   calculadora creciera en complejidad.
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 16: Java → Web Workers
 *   • Principio 5.1.5: Returns Diminish
 *   • Principio 5.1.12: The Goal of Tuning Is Simultaneous Failure
 * 
 * CASO DE ESTUDIO ADAPTADO (RFC-HPBN, Sección 4.2):
 *   "Dispositivo Android de gama media-baja del bartender, no del Gerente
 *    de A&B que ya vio la demo en un dispositivo mejor"
 * ============================================================================
 */

import { calculateBarRoi } from '../lib/performance/calculateBarRoi';

// Handler de mensajes del Web Worker
self.onmessage = (event: MessageEvent<{ tragos: number }>) => {
  try {
    const { tragos } = event.data;
    
    // Validación de entrada
    if (typeof tragos !== 'number' || tragos < 0) {
      self.postMessage({
        error: 'Los tragos deben ser un número positivo',
      });
      return;
    }

    // Ejecutar cálculo de ROI (función pura, sin I/O)
    const result = calculateBarRoi(tragos);
    
    // Enviar resultado de vuelta al hilo principal
    self.postMessage({
      success: true,
      data: result,
      input: { tragos },
      timestamp: Date.now(),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
};

// Ejemplo de uso en el componente RoiCalculator.tsx:
// const worker = new Worker(
//   new URL('../workers/roiCalculator.worker.ts', import.meta.url)
// );
// worker.postMessage({ tragos: sliderValue });
// worker.onmessage = (e) => {
//   if (e.data.success) {
//     setResultado(e.data.data);
//   } else {
//     setError(e.data.error);
//   }
// };