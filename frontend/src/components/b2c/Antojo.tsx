/**
 * ============================================================================
 * El antojo — deseo e identificación
 * ============================================================================
 *
 * Responde a la única pregunta que tiene la persona después del hero: "vale,
 * ¿y por qué debería importarme?".
 *
 * No se habla de la empresa todavía. Se habla de ella: de ese momento a las
 * once de la noche en que quiere algo y todo lo que hay es lo de siempre. La
 * identificación va antes que la explicación; al revés no funciona.
 */

export default function Antojo() {
  return (
    <section className="relative bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      {/* Línea de luz: separa sin usar un borde duro. */}
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-[#d97325]/40 to-transparent" />

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
          Reconócelo
        </p>

        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
          Tienes antojo de algo.
          <br />
          <span className="text-[#8f8479]">Pero no de lo de siempre.</span>
        </h2>

        <div className="mt-10 space-y-6 text-lg leading-relaxed text-[#c9bfb2]">
          <p>
            Ese momento en que quieres <em className="not-italic text-[#f5f1ea]">algo</em>, y
            repasas mentalmente las mismas cuatro opciones de siempre. Ninguna te
            emociona. Terminas pidiendo cualquier cosa y se te olvida antes de
            terminarla.
          </p>

          <p className="text-2xl font-medium leading-snug text-[#f5f1ea] sm:text-3xl">
            Un cono Bocazo no se olvida.
          </p>

          <p>
            No porque sea enorme ni porque lleve veinte ingredientes. Porque está
            construido para que el primer bocado te sorprenda y el último te deje
            queriendo otro. Eso es todo. Eso es suficiente.
          </p>
        </div>
      </div>
    </section>
  );
}
