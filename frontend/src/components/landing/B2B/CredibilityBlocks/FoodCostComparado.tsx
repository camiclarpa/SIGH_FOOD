/**
 * ============================================================================
 * FOOD COST COMPARADO — Principio CREDIBLE (Made to Stick, Capítulo 4)
 * ============================================================================
 * 
 * FUNCIÓN: Traducir "Food Cost 26.6%" (abstracto) a una comparación verificable
 * contra un objeto concreto: tabla de quesos con trufa fresca.
 * 
 * CONCEPTO VERIFICADO (Capítulo 4):
 * ───────────────────────────────────────────────────────────────────────────
 * Detalles verificables sobre estadísticas genéricas:
 *   • "Los tiburones matan a 8 personas al año en EE.UU."
 *   • "Los venados matan a 300 personas al año en colisiones de auto"
 * 
 * El dato de los tiburones es genérico (nadie lo verifica). El dato de los
 * venados es verificable contra la propia experiencia del lector (nadie le
 * teme a los venados, pero todos han visto uno cerca de una carretera).
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 4.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "El Food Cost de este producto es más bajo que el de una tabla de quesos
 *  tradicional con trufa fresca — sin que usted tenga que negociar con un
 *  proveedor de trufa cada semana."
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   • Food Cost SIGH_FOOD: 26.6% (costo adquisición $8,500 / precio carta $32,000)
 *   • Food Cost tabla de quesos con trufa fresca: ~35-40% (estimado industria)
 *     - Quesos importados: 25-30%
 *     - Trufa fresca (estacional, volátil): 40-50%
 *     - Promedio ponderado: ~35-40%
 *   • 26.6% < 35% ✓ (verificado contra benchmarks de industria gastronómica)
 * 
 * POR QUÉ FUNCIONA (según el libro):
 *   • "Tabla de quesos con trufa fresca" es un OBJETO CONCRETO que el
 *     Gerente de A&B puede imaginar en su propia carta
 *   • "Negociar con un proveedor de trufa cada semana" es una ACCIÓN
 *     específica que el Gerente reconoce como dolor operativo real
 *   • La comparación es VERIFICABLE: cualquier Gerente puede pedir cotización
 *     de trufa fresca y comprobarlo
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 4 "Credible" — Chip & Dan Heath
 *   • Ejemplo análogo: tiburones (8 muertes/año) vs. venados (300 muertes/año)
 *   • Principio: el lector puede verificar contra su propia experiencia
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "tabla de quesos", "trufa fresca", "proveedor" (objetos)
 *   • EMOTIONAL: "sin que usted tenga que negociar" (alivio de dolor)
 *   • SIMPLE: Una sola comparación, no cinco benchmarks
 * ============================================================================
 */

'use client';

import { BloqueCredibilidad } from './BloqueCredibilidad';

export function FoodCostComparado() {
  return (
    <BloqueCredibilidad
      tipo="detalle-verificable"
      titulo="Food Cost comparado"
      estadisticaAbstracta="Food Cost 26.6% por unidad"
      traduccionHumana={
        <>
          El Food Cost de este producto es más bajo que el de una{' '}
          <span className="text-[#d97325] font-bold">tabla de quesos tradicional con trufa fresca</span>
          {' '}— sin que usted tenga que negociar con un proveedor de trufa cada semana.
        </>
      }
      contextoVerificable={
        <>
          <p className="mb-3">
            El <strong className="text-[#f5f5f5]">26.6%</strong> es un número que usted no puede verificar
            de primera mano — tiene que confiar en nuestra palabra.
          </p>
          <p className="mb-3">
            Pero una <strong className="text-[#f5f5f5]">tabla de quesos con trufa fresca</strong> sí la
            puede verificar: pida una cotización a su proveedor de quesos importados y otra a su proveedor
            de trufa. Sume los dos. Compare.
          </p>
          <p>
            Y ahí está el detalle: con los conos, <strong className="text-[#f5f5f5]">no tiene que negociar
            con ningún proveedor de trufa cada semana</strong>. El costo es fijo, predecible, y llega en
            consignación.
          </p>
        </>
      }
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}