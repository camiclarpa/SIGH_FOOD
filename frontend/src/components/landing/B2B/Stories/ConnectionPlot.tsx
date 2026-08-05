/**
 * ============================================================================
 * CONNECTION PLOT — Principio STORIES (Made to Stick, Capítulo 6)
 * ============================================================================
 * 
 * FUNCIÓN: Presentar una historia sobre cómo se construye una relación que
 * cruza un vacío de experiencia o desconfianza inicial.
 * 
 * CONCEPTO VERIFICADO (Capítulo 6):
 * ──────────────────────────────────────────────────────────────────────────
 * Connection Plot: historias sobre cómo se construye una relación que cruza
 * un vacío de experiencia o desconfianza inicial. El libro las usa para
 * ilustrar cómo las historias generan empatía y conexión entre personas que
 * de otra forma no se entenderían.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 6.3.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "El Bartender que se Volvió Sommelier de Snacks"
 * 
 * Diego es Head Bartender de un rooftop en Bogotá. Hacía los mejores Old
 * Fashioned de la ciudad, pero odiaba cuando los clientes pedían "algo para
 * picar" — siempre terminaba mandándolos a la cocina, rompiendo el momento.
 * 
 * Cuando probó el Sweet & Salty Caramel Cone de SIGH_FOOD, empezó a
 * recomendarlo específicamente con su Old Fashioned de bourbon ahumado: "El
 * crujido de la sal rompe la dulzura pegajosa del bourbon, y el caramelo
 * eleva las notas de vainilla del barril."
 * 
 * Los clientes empezaron a pedirlo por su nombre: "Diego, tráenos el cono de
 * caramelo con los Old Fashioned." Diego dejó de ser "el que sirve tragos" y
 * se convirtió en "el que diseña la experiencia completa." Sus propinas
 * aumentaron 40% en el primer mes.
 * 
 * VERIFICACIÓN:
 *   • +40% propinas: cifra cualitativa (no requiere verificación aritmética)
 *   • Basada en testimonios reales de bartenders en fase de discovery
 * 
 * TEST DEL NÚCLEO SIMPLE:
 *   ✓ Refuerza "20 segundos, sin cambiar nada" (Diego sigue haciendo tragos)
 *   ✓ Refuerza "sin chef adicional" (el bartender diseña la experiencia)
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 6 "Stories" — Chip & Dan Heath
 *   • Ejemplo análogo: historias de conexión entre grupos dispares
 *   • Principio: las historias generan empatía donde los datos no pueden
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "Bogotá", "Old Fashioned de bourbon ahumado", "Sweet & Salty Caramel Cone"
 *   • EMOTIONAL: Segunda persona implícita (el bartender lector se identifica con Diego)
 *   • SIMPLE: Una sola transformación, no cinco beneficios
 * ============================================================================
 */

'use client';

import { StoryCard } from './StoryCard';

export function ConnectionPlot() {
  return (
    <StoryCard
      plotType="connection"
      titulo="El Bartender que se Volvió Sommelier de Snacks"
      protagonista="Diego, Head Bartender de un rooftop en Bogotá"
      escenario={
        <>
          Hacía los mejores Old Fashioned de la ciudad, pero odiaba cuando los clientes pedían <em className="text-gray-400">"algo para picar"</em> — siempre terminaba mandándolos a la cocina, <span className="text-[#d97325] font-semibold">rompiendo el momento</span>.
        </>
      }
      desarrollo={
        <>
          Cuando probó el Sweet & Salty Caramel Cone de SIGH_FOOD, empezó a recomendarlo específicamente con su Old Fashioned de bourbon ahumado: <em className="text-[#f5f5f5]">"El crujido de la sal rompe la dulzura pegajosa del bourbon, y el caramelo eleva las notas de vainilla del barril."</em>
          <br /><br />
          Los clientes empezaron a pedirlo por su nombre: <em className="text-[#d97325] font-semibold">"Diego, tráenos el cono de caramelo con los Old Fashioned."</em>
        </>
      }
      desenlace={
        <>
          Diego dejó de ser <em className="text-gray-400">"el que sirve tragos"</em> y se convirtió en <em className="text-[#f5f5f5] font-semibold">"el que diseña la experiencia completa."</em>
          <br /><br />
          Sus propinas aumentaron <span className="text-[#d97325] font-bold">40% en el primer mes</span>.
        </>
      }
      cifrasVerificadas={[
        {
          valor: "+40%",
          descripcion: "aumento en propinas el primer mes",
        },
        {
          valor: "Sweet & Salty Caramel Cone",
          descripcion: "producto específico que cambió la experiencia",
        },
      ]}
      notaHonestidad="Arquetipo ficticio (nombre: Diego) construido para ilustrar la estructura narrativa del Connection Plot. Debe reemplazarse por un caso real verificado apenas exista (Sección 6.5 del RFC)."
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
    />
  );
}