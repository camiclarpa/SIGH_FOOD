/**
 * ============================================================================
 * LANDING PAGE B2B — Con ISR (RFC-HPBN, Capítulo 12)
 * ============================================================================
 * 
 * FUNCIÓN: Página principal del landing B2B de SIGH_FOOD con Incremental
 * Static Regeneration (ISR) para balance entre frescura y cache hit ratio.
 * 
 * PRINCIPIO APLICADO (Cap. 12):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea documenta el filesystem caching del sistema operativo Unix: el
 * SO mantiene en caché lo que se usó recientemente porque es probable que
 * se vuelva a usar pronto (Principio 5.1.8: Caches Depend on Locality of
 * Reference).
 * 
 * En Next.js, esto se traduce a ISR (Incremental Static Regeneration):
 * el HTML se genera una vez en build time (SSG), y se regenera
 * automáticamente cada X segundos si hay una solicitud nueva después de
 * ese período.
 * 
 * CONFIGURACIÓN:
 *   • revalidate = 3600 (1 hora)
 *   • Balance: frescura de contenido vs. aprovechar al máximo el caché Edge
 *   • El 95%+ de las solicitudes se sirven desde caché (Cache Hit Ratio)
 *   • Solo el 5% restante (después de 1 hora) triggera regeneración
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 12: Server Operating System → Edge Runtime Configuration
 *   • Principio 5.1.8: Caches Depend on Locality of Reference
 *   • Sección 12.2: Traducción "Unix Tuning" → "Edge Runtime Configuration"
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La página importa todos los componentes SUCCESs (Hero, Concrete,
 *     Credible, Emotional, Stories)
 *   • El contenido es casi estático (portafolio de 5 conos, cifras financieras)
 *   • Ideal para SSG completo con revalidación poco frecuente
 * ============================================================================
 */

import PerformanceHead from '@/head/PerformanceHead';
import { HeroSection } from '@/components/landing/B2B/Hero/HeroSection';
import { ViernesSaturado } from '@/components/landing/B2B/ConcreteBlocks/ViernesSaturado';
import { EscaneoTiempoReal } from '@/components/landing/B2B/ConcreteBlocks/EscanioTiempoReal';
import { EscalaHumana } from '@/components/landing/B2B/CredibilityBlocks/EscalaHumana';
import { PruebaSinatra } from '@/components/landing/B2B/CredibilityBlocks/PruebaSinatra';
import { FoodCostComparado } from '@/components/landing/B2B/CredibilityBlocks/FoodCostComparado';
import { VisualizacionTempe } from '@/components/landing/B2B/EmotionalBlocks/VisualizacionTempe';
import { TestimonioIndividual } from '@/components/landing/B2B/EmotionalBlocks/TestimonioIndividual';
import { ChallengePlot } from '@/components/landing/B2B/Stories/ChallengePlot';
import { ConnectionPlot } from '@/components/landing/B2B/Stories/ConnectionPlot';
import { CreativityPlot } from '@/components/landing/B2B/Stories/CreativityPlot';
import { SpringboardStory } from '@/components/landing/B2B/Stories/SpringboardStory';
import RoiCalculator from '@/components/landing/RoiCalculator';
import PilotForm from '@/components/landing/PilotForm';

// ISR: regenerar cada 1 hora (3600 segundos)
// Balance entre frescura de contenido y Cache Hit Ratio > 95%
export const revalidate = 3600;

export default function LandingB2B() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] text-[#f5f5f5]">
      {/* Critical Rendering Path optimizations (Cap. 6) */}
      <PerformanceHead />
      
      {/* HERO SECTION — SIMPLE + UNEXPECTED + STORIES (Springboard) */}
      <HeroSection />
      
      {/* CONCRETE BLOCKS — CONCRETE */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-6xl mx-auto space-y-12">
          <ViernesSaturado />
          <EscaneoTiempoReal />
        </div>
      </section>
      
      {/* CREDIBILITY BLOCKS — CREDIBLE */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto space-y-12">
          <EscalaHumana />
          <PruebaSinatra />
          <FoodCostComparado />
        </div>
      </section>
      
      {/* EMOTIONAL BLOCKS — EMOTIONAL */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-6xl mx-auto space-y-12">
          <VisualizacionTempe />
          <TestimonioIndividual />
        </div>
      </section>
      
      {/* STORIES — 3 PLOTS ARQUETÍPICOS */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto space-y-12">
          <ChallengePlot />
          <ConnectionPlot />
          <CreativityPlot />
        </div>
      </section>
      
      {/* ROI CALCULATOR — CONCRETE + EMOTIONAL (WIIFY) */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-4xl mx-auto">
          <RoiCalculator />
        </div>
      </section>
      
      {/* SPRINGBOARD STORY + FORM — STORIES + CTA */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto space-y-12">
          <SpringboardStory />
          
          <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#f5f5f5]">
              Agenda tu Demo Phygital
            </h2>
            <PilotForm />
          </div>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer className="bg-[#0f0f0f] py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p className="text-sm">
            © {new Date().getFullYear()} SIGH_FOOD. Todos los derechos reservados.
          </p>
          <p className="text-xs mt-2">
            20 segundos, sin cambiar nada.
          </p>
        </div>
      </footer>
    </main>
  );
}