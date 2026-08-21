/**
 * ============================================================================
 * Prueba social
 * ============================================================================
 *
 * La estructura psicológica es: la marca dice → el cliente confirma. Sin esa
 * confirmación, todo lo anterior es publicidad. Con ella, es evidencia.
 *
 * Dos estados:
 *
 *   · Con reseñas —reales, o de ejemplo mientras MODO_DEMO esté activo— se
 *     muestran con su nota y su recuento.
 *   · Sin ninguna, la sección no se queda coja: enseña la campaña de
 *     lanzamiento, que convierte la falta de reseñas en un motivo para pedir.
 *
 * La campaña de los primeros cien se muestra SIEMPRE, incluso habiendo reseñas.
 * Es lo que resuelve el problema comercial de una marca recién abierta: quien
 * entra hoy no llega tarde a algo consolidado, llega temprano a algo que empieza
 * — y eso, bien contado, vende más que un testimonio.
 */

import { LANZAMIENTO, MARCA, cifras, enlaceWhatsApp, testimoniosVisibles } from './datos';

function Estrellas({ nota }: { nota: number }) {
  return (
    <span className="text-[#d97325]" aria-label={`${nota} sobre 5`}>
      {'★'.repeat(Math.round(nota))}
      <span className="text-[#4a4239]">{'★'.repeat(5 - Math.round(nota))}</span>
    </span>
  );
}

export default function PruebaSocial() {
  const testimonios = testimoniosVisibles();
  const c = cifras();
  const hay = testimonios.length > 0;

  // Cuántos quedan de la meta. Un contador que baja empuja más que uno que sube:
  // dice cuánto falta para que se acabe, no cuánto lleva hecho.
  const restantes = Math.max(0, LANZAMIENTO.meta - LANZAMIENTO.llevamos);
  const porcentaje = Math.min(100, Math.round((LANZAMIENTO.llevamos / LANZAMIENTO.meta) * 100));

  return (
    <section className="bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            Lo que dicen
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            {hay ? 'No tienes que creernos a nosotros.' : 'Sé de los primeros en contarlo.'}
          </h2>
        </div>

        {/* --- Cifras: cada una se oculta sola si no está contada --- */}
        {(c.valoracion !== null || c.conosServidos !== null) && (
          <div className="mt-12 flex flex-wrap items-start justify-center gap-x-16 gap-y-8">
            {c.valoracion !== null && (
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-[#f5f1ea]">
                  {c.valoracion.toFixed(1)}
                </p>
                <Estrellas nota={c.valoracion} />
                {c.numeroResenas !== null && (
                  <p className="mt-1 text-sm text-[#8f8479]">{c.numeroResenas} reseñas</p>
                )}
              </div>
            )}

            {c.conosServidos !== null && (
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-[#f5f1ea]">
                  {c.conosServidos.toLocaleString('es-CO')}
                </p>
                <p className="mt-1 text-sm text-[#8f8479]">conos servidos</p>
              </div>
            )}
          </div>
        )}

        {/* --- Testimonios --- */}
        {hay && (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonios.map((t, i) => (
              <figure
                key={i}
                className="flex flex-col rounded-2xl border border-white/10 bg-[#1c1812] p-6"
              >
                <Estrellas nota={5} />
                <blockquote className="mt-4 flex-1 leading-relaxed text-[#e5ded4]">
                  “{t.texto}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-medium text-[#f5f1ea]">{t.autor}</span>
                  {t.detalle && <span className="text-[#8f8479]"> · {t.detalle}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* --- Campaña de lanzamiento --- */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-[#d97325]/30 bg-gradient-to-br from-[#d97325]/12 to-transparent p-8 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
                Los primeros {LANZAMIENTO.meta}
              </p>

              <h3 className="mt-3 font-display text-2xl font-bold leading-snug text-[#f5f1ea] sm:text-3xl">
                Bocazo acaba de abrir. Puedes ser de los primeros que lo cuentan.
              </h3>

              <p className="mt-4 max-w-xl leading-relaxed text-[#c9bfb2]">
                Estamos buscando a las primeras {LANZAMIENTO.meta} personas que prueben los
                conos y nos digan qué les pareció — lo bueno y lo que haya que arreglar.
                A cambio: <span className="text-[#f5f1ea]">{LANZAMIENTO.incentivo}</span>
              </p>

              {/* Barra de avance: hace la campaña concreta en vez de una promesa
                  vaga, y el número que queda crea una urgencia que es real. */}
              <div className="mt-7 max-w-md">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-[#f5f1ea]">
                    {LANZAMIENTO.llevamos} de {LANZAMIENTO.meta}
                  </span>
                  <span className="text-[#d97325]">quedan {restantes} cupos</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={LANZAMIENTO.llevamos}
                  aria-valuemin={0}
                  aria-valuemax={LANZAMIENTO.meta}
                  aria-label="Avance de la campaña de lanzamiento"
                >
                  <div
                    className="h-full rounded-full bg-[#d97325] transition-[width] duration-700"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:w-56">
              <a
                href={enlaceWhatsApp(
                  `Hola, quiero ser de los primeros ${LANZAMIENTO.meta} en probar Bocazo.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#d97325] px-7 py-4 text-center text-sm font-semibold text-[#12100e] transition-all hover:scale-[1.03] hover:bg-[#e8892f] active:scale-100"
              >
                Quiero mi cupo
              </a>
              <a
                href={`https://instagram.com/${MARCA.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-7 py-4 text-center text-sm font-medium text-[#f5f1ea] transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Verlo en Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
