/**
 * ============================================================================
 * LANDING B2B — SSG con ISR (RFC-HPBN, Capítulo 12)
 * RFC-001: Capa Edge — Contenido estático (SSG)
 * ============================================================================
 * 
 * FUNCIÓN: Página principal del landing B2B de SIGH_FOOD con Incremental
 * Static Regeneration (ISR) para balance entre frescura y cache hit ratio.
 * 
 * PRINCIPIO APLICADO (RFC-HPBN Cap. 12):
 *   Kleppmann documenta el filesystem caching del sistema operativo Unix:
 *   el SO mantiene en caché lo que se usó recientemente porque es probable
 *   que se vuelva a usar pronto (Principio 5.1.8: Caches Depend on Locality
 *   of Reference).
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
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La página importa todos los componentes SUCCESs (Hero, Concrete,
 *     Credible, Emotional, Stories)
 *   • El contenido es casi estático (portafolio de 5 conos, cifras financieras)
 *   • Ideal para SSG completo con revalidación poco frecuente
 * ============================================================================
 */

import HeroSection from '@/components/hero/HeroSection';
import PortafolioConos from '@/components/portafolio/PortafolioConos';
import CalculadoraRoi from '@/components/calculadora/CalculadoraRoi';
import FormularioLead from '@/components/formulario/FormularioLead';
import HistoriasArquetipos from '@/components/historias/HistoriasArquetipos';
import BloquesCredibilidad from '@/components/credibilidad/BloquesCredibilidad';
import Footer from '@/components/footer/Footer';

// ISR: regenerar cada 1 hora (3600 segundos)
// Balance entre frescura de contenido y Cache Hit Ratio > 95%
export const revalidate = 3600;

export default function LandingB2B() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] text-[#f5f5f5]">
      {/* HERO SECTION — SIMPLE + UNEXPECTED + STORIES (Springboard) */}
      <HeroSection />
      
      {/* CONCRETE BLOCKS — CONCRETE */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-gray-400 text-sm mb-12 tracking-widest uppercase">
            El Momento SIGH_FOOD en Mesa
          </h2>
          <PortafolioConos />
        </div>
      </section>
      
      {/* CREDIBILITY BLOCKS — CREDIBLE */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <BloquesCredibilidad />
        </div>
      </section>
      
      {/* EMOTIONAL BLOCKS — EMOTIONAL */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-[#f5f5f5]">
            Imagínese su propio fin de semana
          </h2>
        </div>
      </section>
      
      {/* STORIES — 3 PLOTS ARQUETÍPICOS */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <HistoriasArquetipos />
        </div>
      </section>
      
      {/* ROI CALCULATOR — CONCRETE + EMOTIONAL (WIIFY) */}
      <section className="py-20 px-6 bg-[#1f1f1f]">
        <div className="max-w-4xl mx-auto">
          <CalculadoraRoi />
        </div>
      </section>
      
      {/* SPRINGBOARD STORY + FORM — STORIES + CTA */}
      <section className="py-20 px-6 bg-[#1a1a1a]">
        <div className="max-w-4xl mx-auto">
          <FormularioLead />
        </div>
      </section>
      
      {/* FOOTER */}
      <Footer />
    </main>
  );
}