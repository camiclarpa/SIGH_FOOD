/**
 * ============================================================================
 * Por qué es diferente — beneficios y diferenciadores
 * ============================================================================
 *
 * Responde a "¿por qué este y no otro?".
 *
 * La regla que ordena esta sección: no se venden características, se vende lo
 * que producen. "Base hecha en molde" no le dice nada a nadie; "sigue
 * crujiente cuando llega a tu mano" sí, porque describe algo que la persona va
 * a sentir.
 *
 * Por eso cada bloque tiene las dos mitades: el hecho y su consecuencia. El
 * hecho da credibilidad; la consecuencia da ganas.
 */

const RAZONES = [
  {
    icono: '🔥',
    titulo: 'Se rellena cuando pides',
    hecho: 'El relleno entra en el momento, no antes.',
    consecuencia:
      'La base sigue crujiendo cuando llega a tu mano. Esa es la mitad de la gracia, y es lo primero que se pierde cuando algo lleva rato hecho.',
  },
  {
    icono: '🧂',
    titulo: 'Combinaciones que no esperas',
    hecho: 'Maracuyá con anís. Queso ahumado con trufa. Caramelo con sal.',
    consecuencia:
      'El primer bocado te descoloca un segundo y el segundo ya lo entiendes. Ese instante de sorpresa es lo que hace que lo cuentes.',
  },
  {
    icono: '⏱️',
    titulo: 'Listo en minutos',
    hecho: 'Se arma delante de ti en menos de veinte segundos.',
    consecuencia:
      'No tienes que sentarte, ni esperar, ni reservar. Entras con antojo y sales comiendo.',
  },
  {
    icono: '✋',
    titulo: 'Se come de pie',
    hecho: 'Va en cono, con una mano.',
    consecuencia:
      'Puedes seguir caminando, hablando o con la otra mano en tu copa. No interrumpe el plan: se suma a él.',
  },
  {
    icono: '🍸',
    titulo: 'Pensado para acompañar',
    hecho: 'Cada sabor está construido alrededor de un licor.',
    consecuencia:
      'El Volcano con mezcal, el Caramel con bourbon, el Citrus con gin-tonic. No es un añadido: está diseñado para que la copa sepa mejor.',
  },
  {
    icono: '🌱',
    titulo: 'Ingredientes que se ven',
    hecho: 'Todo lo que lleva está a la vista, encima.',
    consecuencia:
      'No hay que fiarse de una descripción. Miras el cono y sabes exactamente qué te vas a comer.',
  },
];

export default function PorQueDiferente() {
  return (
    <section className="bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            La diferencia
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            ¿Por qué este y no cualquier otro antojo?
          </h2>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {RAZONES.map((r) => (
            <div key={r.titulo}>
              <span className="text-3xl" aria-hidden>
                {r.icono}
              </span>

              <h3 className="mt-4 font-display text-xl font-bold text-[#f5f1ea]">
                {r.titulo}
              </h3>

              <p className="mt-2 text-sm font-medium text-[#d97325]">{r.hecho}</p>

              <p className="mt-2.5 text-sm leading-relaxed text-[#c9bfb2]">
                {r.consecuencia}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
