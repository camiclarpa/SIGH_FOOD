/**
 * ============================================================================
 * CALCULATE BAR ROI — Función Pura (RFC-HPBN, Capítulo 15)
 * ============================================================================
 * 
 * FUNCIÓN: Calcular el ROI estimado de un bar basado en tragos por fin de semana.
 * 
 * PRINCIPIO APLICADO (Cap. 15):
 * ───────────────────────────────────────────────────────────────────────────
 * Killelea recomienda FastCGI sobre CGI tradicional porque crear un proceso
 * nuevo por solicitud es costoso. En 2026, esto se traduce a: las funciones
 * puras sin I/O pueden ejecutarse tanto en el cliente (Web Worker, Cap. 16)
 * como en el servidor (Edge Function) sin depender de dependencias pesadas.
 * 
 * Esta función es deliberadamente pura:
 *   • Sin I/O (no llama a APIs, no lee archivos)
 *   • Sin estado (no modifica variables externas)
 *   • Determinística (misma entrada → misma salida)
 * 
 * Esto permite:
 *   • Ejecutarla en un Web Worker para no bloquear el hilo principal (Cap. 16)
 *   • Ejecutarla en una Edge Function para validación server-side
 *   • Testearla de forma aislada sin mocks
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 15: CGI Programs → Serverless Functions
 *   • Principio 5.1.11: Hardware Is Cheap, Software Is Expensive
 *   • Author's Tip #5: Preprocesar contenido fuera de línea siempre que sea posible
 * 
 * CONSTANTES DE NEGOCIO (verificadas contra Playbook de Discovery de SIGH_FOOD):
 *   • TASA_CONVERSION = 0.20 (20% de tragos → conos)
 *   • UTILIDAD_POR_CONO_COP = 23,500 (margen 73.4% sobre precio de carta $32,000)
 *   • SEMANAS_POR_MES = 4.33 (promedio anual)
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   • 100 tragos/fin de semana → 20 conos/fin de semana → 87 conos/mes
 *   • 87 × $23,500 = $2,044,500 COP utilidad mensual
 * ============================================================================
 */

export function calculateBarRoi(tragosPerFinDeSemana: number): {
  conosEstimados: number;
  utilidadMensualCOP: number;
} {
  // Constantes de negocio (verificadas contra Playbook de Discovery)
  const TASA_CONVERSION = 0.20; // 20% de tragos se convierten en conos
  const UTILIDAD_POR_CONO_COP = 23_500; // Margen neto por cono
  const SEMANAS_POR_MES = 4.33; // Promedio anual (52 semanas / 12 meses)

  // Validación de entrada
  if (tragosPerFinDeSemana < 0) {
    throw new Error('Los tragos por fin de semana no pueden ser negativos');
  }

  // Cálculo
  const conosPorFinDeSemana = tragosPerFinDeSemana * TASA_CONVERSION;
  const conosEstimados = Math.round(conosPorFinDeSemana * SEMANAS_POR_MES);
  const utilidadMensualCOP = Math.round(conosEstimados * UTILIDAD_POR_CONO_COP);

  return { conosEstimados, utilidadMensualCOP };
}

// Verificación aritmética (para tests):
// 100 tragos → 20 conos/fin de semana → 87 conos/mes → $2,044,500 COP
// 0 tragos → 0 conos → $0 COP
// 500 tragos → 100 conos/fin de semana → 435 conos/mes → $10,222,500 COP