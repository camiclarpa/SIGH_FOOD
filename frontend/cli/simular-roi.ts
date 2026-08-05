/**
 * ============================================================================
 * SIMULAR ROI — CLI (Capítulo 31: La Web Es un Detalle)
 * ============================================================================
 * 
 * PROPÓSITO: Demostrar que el dominio de SIGH_FOOD puede ejecutarse SIN
 * navegador, SIN React, SIN Next.js — en una simple terminal de Node.js.
 * 
 * CONCEPTO VERIFICADO (Capítulo 31):
 * ─────────────────────────────────────────────────────────────────────────
 * Uncle Bob afirma, de forma deliberadamente provocadora, que la web (el
 * navegador, HTML, HTTP) es un mecanismo de entrega — un detalle intercambiable
 * — y que las reglas de negocio de un sistema bien diseñado no deberían saber
 * que están siendo entregadas a través de un navegador en absoluto.
 * 
 * PRUEBA DE FUEGO:
 *   Si mañana el equipo comercial pidiera una herramienta de línea de comandos
 *   para simular el cálculo de ROI durante una llamada de ventas (sin abrir un
 *   navegador), ¿cuánto código habría que reescribir?
 *   
 *   Respuesta: CERO líneas del dominio se reescriben.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 31: La Web Es un Detalle
 *   • Capítulo 30: La Base de Datos Es un Detalle
 *   • Capítulo 32: Los Frameworks Son Detalles
 * 
 * EJECUCIÓN:
 *   npx tsx cli/simular-roi.ts 100
 *   → Conos estimados: 87
 *   → Ganancia neta mensual: $2,044,500 COP
 * ============================================================================
 */

import { calcularRoiMensual } from '../packages/sighfood-domain/rules/calcularRoi';

// Leer argumento de la línea de comandos
const tragosArgumento = Number(process.argv[2]);

if (isNaN(tragosArgumento) || tragosArgumento < 0) {
  console.error('Uso: npx tsx cli/simular-roi.ts <tragos_por_fin_de_semana>');
  console.error('Ejemplo: npx tsx cli/simular-roi.ts 100');
  process.exit(1);
}

// Ejecutar la MISMA función pura que usa la UI de React
const resultado = calcularRoiMensual(tragosArgumento);

console.log('════════════════════════════════════════════════════════════');
console.log('  SIMULACIÓN DE ROI — SIGH_FOOD');
console.log('════════════════════════════════════════════════════════════');
console.log('');
console.log(`  Tragos por fin de semana: ${tragosArgumento}`);
console.log(`  Conos estimados por mes:  ${resultado.conosEstimados}`);
console.log(`  Ganancia neta mensual:    $${resultado.gananciaNetaMensualCOP.toLocaleString('es-CO')} COP`);
console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log('  Esta CLI usa el MISMO dominio que la UI de React.');
console.log('  CERO líneas del dominio se reescribieron.');
console.log('  La web es, efectivamente, un detalle.');
console.log('════════════════════════════════════════════════════════════');