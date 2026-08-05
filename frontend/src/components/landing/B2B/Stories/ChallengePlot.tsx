/**
 * ============================================================================
 * CHALLENGE PLOT — Principio STORIES (Made to Stick, Capítulo 6)
 * ============================================================================
 * 
 * FUNCIÓN: Presentar una historia de superar un obstáculo formidable, siguiendo
 * el arquetipo de Jared Fogle (Subway) del libro.
 * 
 * CONCEPTO VERIFICADO (Capítulo 6):
 * ───────────────────────────────────────────────────────────────────────────
 * Challenge Plot: una historia de perseverancia contra una probabilidad enorme.
 * El ejemplo central del libro es Jared Fogle, un estudiante universitario que
 * pesaba 425 libras y perdió 245 libras (hasta 180) comiendo en Subway.
 * 
 * Por qué funciona: el lector piensa "si Jared pudo hacerlo, yo puedo hacerlo
 * en mi situación" — inspiración directa para la acción.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 6.3.1):
 * ───────────────────────────────────────────────────────────────────────────
 * "El Fin de Semana que Cambió Todo para Laura"
 * 
 * Laura es Gerente A&B de un gastrobar en Medellín. Llevaba 2 años queriendo
 * agregar comida a la carta, pero los números nunca cerraban: necesitaba un
 * chef ($2,800,000 COP/mes), equipamiento de cocina ($45,000,000 COP de
 * inversión), y asumía un 18% de merma promedio en inventario perecedero.
 * 
 * En marzo agendó la Demo Phygital de SIGH_FOOD. El viernes a las 6 PM llegó
 * el kit piloto en consignación: 50 conos, instrucciones de ensamble en menos
 * de 20 segundos. Laura pensó: "Esto no va a funcionar. Mis bartenders van a
 * resistirse."
 * 
 * El sábado a las 10 PM, el local estaba lleno. Carlos, el Head Bartender,
 * tomó el primer Herbal Citrus Botanical Cone, rompió el elixir, lo vertió,
 * lo sirvió junto a un Gin-Tonic. Tiempo total: 19 segundos.
 * 
 * El domingo por la noche, Laura revisó los números: 87 conos vendidos,
 * $2,044,500 COP de utilidad neta (87 × $23,500 COP, verificado). Cero merma.
 * Cero dependencia de cocina.
 * 
 * El lunes por la mañana, Laura llamó a SIGH_FOOD: "No me quiten los conos.
 * Queremos el contrato anual."
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   • 87 conos × $23,500 COP (utilidad neta) = $2,044,500 COP ✓
 *   • (Fuente: unit economics verificados en Playbook de Discovery)
 * 
 * TEST DEL NÚCLEO SIMPLE:
 *   ✓ Refuerza "20 segundos, sin cambiar nada" (Carlos ensamblo en 19 seg)
 *   ✓ Refuerza "sin chef adicional" (cero dependencia de cocina)
 *   ✓ Refuerza "sin equipamiento" (kit en consignación)
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 6 "Stories" — Chip & Dan Heath
 *   • Ejemplo análogo: Jared Fogle (Subway, 425 → 180 libras)
 *   • Principio: "si pudo hacerlo ahí, puede hacerlo aquí"
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "Medellín", "viernes 6 PM", "sábado 10 PM", "Gin-Tonic"
 *   • CREDIBLE: Cifras verificadas aritméticamente
 *   • EMOTIONAL: Segunda persona implícita (el lector se identifica con Laura)
 *   • SIMPLE: Una sola historia, no tres estadísticas
 * ============================================================================
 */

'use client';

import { StoryCard } from './StoryCard';

export function ChallengePlot() {
  return (
    <StoryCard
      plotType="challenge"
      titulo="El Fin de Semana que Cambió Todo para Laura"
      protagonista="Laura, Gerente A&B de un gastrobar en Medellín"
      escenario={
        <>
          Llevaba <span className="text-[#d97325] font-semibold">2 años</span> queriendo agregar comida a la carta, pero los números nunca cerraban: necesitaba un chef (<span className="text-[#d97325] font-semibold">$2,800,000 COP/mes</span>), equipamiento de cocina (<span className="text-[#d97325] font-semibold">$45,000,000 COP</span> de inversión), y asumía un <span className="text-[#d97325] font-semibold">18% de merma</span> promedio en inventario perecedero.
        </>
      }
      desarrollo={
        <>
          En marzo agendó la Demo Phygital de SIGH_FOOD. El viernes a las 6 PM llegó el kit piloto en consignación: 50 conos, instrucciones de ensamble en menos de 20 segundos. Laura pensó: <em className="text-gray-400">"Esto no va a funcionar. Mis bartenders van a resistirse."</em>
          <br /><br />
          El sábado a las 10 PM, el local estaba lleno. Carlos, el Head Bartender, tomó el primer Herbal Citrus Botanical Cone, rompió el elixir, lo vertió, lo sirvió junto a un Gin-Tonic. <span className="text-[#d97325] font-semibold">Tiempo total: 19 segundos.</span>
        </>
      }
      desenlace={
        <>
          El domingo por la noche, Laura revisó los números: <span className="text-[#d97325] font-bold">87 conos vendidos</span>, <span className="text-[#d97325] font-bold">$2,044,500 COP de utilidad neta</span>. Cero merma. Cero dependencia de cocina.
          <br /><br />
          El lunes por la mañana, Laura llamó a SIGH_FOOD: <em className="text-[#f5f5f5]">"No me quiten los conos. Queremos el contrato anual."</em>
        </>
      }
      cifrasVerificadas={[
        {
          valor: "87 conos",
          descripcion: "vendidos en un fin de semana",
        },
        {
          valor: "$2,044,500 COP",
          descripcion: "de utilidad neta",
          verificacion: "87 × $23,500",
        },
        {
          valor: "19 segundos",
          descripcion: "tiempo de ensamble de Carlos",
        },
        {
          valor: "0% merma",
          descripcion: "vs. 18% promedio anterior",
        },
      ]}
      notaHonestidad="Arquetipo ficticio (nombre: Laura) construido para ilustrar la estructura narrativa del Challenge Plot. Debe reemplazarse por un caso real verificado apenas exista (Sección 6.5 del RFC)."
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      }
    />
  );
}