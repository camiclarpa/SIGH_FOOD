/**
 * ============================================================================
 * Reducción de riesgo
 * ============================================================================
 *
 * Va justo después del precio, que es donde aparece el miedo: "¿y si no me
 * gusta?", "¿y si no llega?", "¿y si no es como en la foto?".
 *
 * Cada bloque desactiva una de esas dudas con algo comprobable, no con una
 * promesa vaga. "Atención personalizada" no tranquiliza a nadie; "te contesta
 * una persona por WhatsApp, no un bot" sí, porque es verificable en el acto.
 *
 * La garantía está escrita en primera persona y sin letra pequeña a propósito:
 * una condición enterrada convierte la garantía en otra fuente de sospecha.
 */

const GARANTIAS = [
  {
    icono: '👀',
    titulo: 'Es lo que ves',
    texto:
      'Las fotos son de los conos reales, sin montaje. Lo que llega a tu mano se parece a lo que estás mirando ahora mismo.',
  },
  {
    icono: '🙋',
    titulo: 'Te contesta una persona',
    texto:
      'Escribes al WhatsApp y responde alguien del local, no un bot. Si tienes una alergia o una duda, pregúntala antes de pedir.',
  },
  {
    icono: '🔄',
    titulo: 'Si algo sale mal, se arregla',
    texto:
      'Si tu cono llega mal servido o no es lo que pediste, te lo cambiamos. Sin discutir y sin que tengas que insistir.',
  },
  {
    icono: '💵',
    titulo: 'Pagas como quieras',
    texto:
      'Efectivo, tarjeta o transferencia. No pedimos datos por adelantado ni guardamos tu tarjeta en ningún sitio.',
  },
];

export default function Confianza() {
  return (
    <section className="bg-[#17140f] px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl font-bold text-[#f5f1ea] sm:text-3xl">
          Nada que perder
        </h2>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {GARANTIAS.map((g) => (
            <div key={g.titulo} className="text-center sm:text-left">
              <span className="text-2xl" aria-hidden>
                {g.icono}
              </span>
              <h3 className="mt-3 font-semibold text-[#f5f1ea]">{g.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#a89b8c]">{g.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
