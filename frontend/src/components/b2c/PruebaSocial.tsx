/**
 * ============================================================================
 * Prueba social
 * ============================================================================
 *
 * La sección más delicada de la página, y la única donde mentir sale caro de
 * verdad.
 *
 * La estructura psicológica es: la marca dice → el cliente confirma. Sin esa
 * confirmación, todo lo anterior es publicidad. Con ella, es evidencia.
 *
 * Por eso está construida en dos estados y NINGUNO inventa nada:
 *
 *   · Con reseñas reales en `datos.ts`, se muestran, con su nota y su recuento.
 *   · Sin ellas —que es hoy—, se muestra un bloque que pide la primera reseña
 *     en lugar de fingir que ya hay doscientas.
 *
 * Un "4.9/5 ⭐ · +2.000 clientes" inventado no es un adorno: es publicidad
 * engañosa, la SIC la sanciona, y el día que alguien pregunte por esas reseñas
 * y no existan se lleva por delante la confianza que la sección venía a
 * construir. Cuando tengas las primeras, se pegan en TESTIMONIOS y esto cambia
 * solo.
 */

import { CIFRAS, MARCA, TESTIMONIOS, enlaceWhatsApp } from './datos';

function Estrellas({ nota }: { nota: number }) {
  return (
    <span className="text-[#d97325]" aria-label={`${nota} sobre 5`}>
      {'★'.repeat(Math.round(nota))}
      <span className="text-[#4a4239]">{'★'.repeat(5 - Math.round(nota))}</span>
    </span>
  );
}

export default function PruebaSocial() {
  const hayTestimonios = TESTIMONIOS.length > 0;

  return (
    <section className="bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            Lo que dicen
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            {hayTestimonios ? 'No tienes que creernos a nosotros.' : 'Sé el primero en contarlo.'}
          </h2>
        </div>

        {/* --- Cifras: cada una se oculta sola si no está contada --- */}
        {(CIFRAS.valoracion !== null || CIFRAS.conosServidos !== null) && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
            {CIFRAS.valoracion !== null && (
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-[#f5f1ea]">
                  {CIFRAS.valoracion.toFixed(1)}
                </p>
                <Estrellas nota={CIFRAS.valoracion} />
                {CIFRAS.numeroResenas !== null && (
                  <p className="mt-1 text-sm text-[#8f8479]">
                    {CIFRAS.numeroResenas} reseñas
                  </p>
                )}
              </div>
            )}

            {CIFRAS.conosServidos !== null && (
              <div className="text-center">
                <p className="font-display text-4xl font-bold text-[#f5f1ea]">
                  {CIFRAS.conosServidos.toLocaleString('es-CO')}
                </p>
                <p className="mt-1 text-sm text-[#8f8479]">conos servidos</p>
              </div>
            )}
          </div>
        )}

        {hayTestimonios ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIOS.map((t, i) => (
              <figure
                key={i}
                className="rounded-2xl border border-white/10 bg-[#1c1812] p-6"
              >
                <Estrellas nota={5} />
                <blockquote className="mt-4 leading-relaxed text-[#e5ded4]">
                  “{t.texto}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-medium text-[#f5f1ea]">{t.autor}</span>
                  {t.detalle && <span className="text-[#8f8479]"> · {t.detalle}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          /* --- Sin reseñas todavía --- */
          <div className="mt-12 rounded-2xl border border-white/10 bg-[#1c1812] p-9 text-center sm:p-12">
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-[#c9bfb2]">
              Bocazo acaba de abrir, así que aquí todavía no hay nada que enseñar.
              Preferimos decirlo antes que llenar esta sección de frases que nadie
              ha dicho.
            </p>

            <p className="mx-auto mt-5 max-w-xl leading-relaxed text-[#8f8479]">
              Si pruebas uno y te gusta —o no—, cuéntanoslo. Las primeras reseñas
              son las que más pesan, y van a aparecer justo aquí.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={enlaceWhatsApp('Hola, probé un cono y quiero contarles qué me pareció.')}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#d97325] px-7 py-3.5 text-sm font-semibold text-[#12100e] transition-all hover:scale-[1.03] hover:bg-[#e8892f] active:scale-100"
              >
                Contar mi experiencia
              </a>
              <a
                href={`https://instagram.com/${MARCA.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-[#f5f1ea] transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Verlo en Instagram
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
