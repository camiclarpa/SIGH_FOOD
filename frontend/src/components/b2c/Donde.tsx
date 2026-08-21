/**
 * ============================================================================
 * Dónde estamos
 * ============================================================================
 *
 * Va inmediatamente después del precio, porque esa es la pregunta que aparece
 * justo ahí: "vale, me convence… ¿y dónde queda?".
 *
 * Antes esta información solo estaba en el pie, y quien llegaba desde Instagram
 * con ganas de ir tenía que bajar la página entera para encontrar "Bogotá" a
 * secas. Ese es el momento exacto en que se pierde la venta: no por el precio,
 * sino por no saber adónde ir.
 *
 * Tres cosas y ninguna más: dónde, cuándo abre y cómo llegar. El mapa se enlaza
 * en lugar de incrustarse — un iframe de Google carga scripts de terceros, pone
 * cookies antes de que nadie consienta nada y añade medio megabyte a una página
 * que se ha optimizado con cuidado. El botón hace lo mismo y abre la app de
 * mapas del móvil, que es lo que la persona quiere de todas formas.
 */

import { DOMICILIO, HORARIOS, LOCAL, enlaceWhatsApp, precio } from './datos';

/** Qué día es hoy, para marcar el horario que aplica ahora. */
function bloqueDeHoy(): string {
  const d = new Date().getDay();
  if (d === 0) return 'Domingo';
  if (d === 5 || d === 6) return 'Viernes y sábado';
  return 'Lunes a jueves';
}

export default function Donde() {
  const hoy = bloqueDeHoy();

  return (
    <section id="donde" className="bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            Dónde encontrarnos
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            Estamos en {LOCAL.zona}.
          </h2>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {/* --- Dirección --- */}
          <div className="rounded-2xl border border-white/10 bg-[#1c1812] p-7">
            <span className="text-2xl" aria-hidden>
              📍
            </span>
            <h3 className="mt-4 font-display text-xl font-bold text-[#f5f1ea]">La dirección</h3>

            <address className="mt-3 not-italic leading-relaxed text-[#c9bfb2]">
              {LOCAL.direccion}
              <br />
              {LOCAL.zona}, {LOCAL.ciudad}
            </address>

            <p className="mt-3 text-sm text-[#8f8479]">{LOCAL.detalle}</p>

            <a
              href={LOCAL.mapa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#d97325] px-6 py-3.5 text-sm font-semibold text-[#12100e] transition-all hover:scale-[1.02] hover:bg-[#e8892f] active:scale-100"
            >
              Cómo llegar
            </a>
          </div>

          {/* --- Horarios --- */}
          <div className="rounded-2xl border border-white/10 bg-[#1c1812] p-7">
            <span className="text-2xl" aria-hidden>
              🕔
            </span>
            <h3 className="mt-4 font-display text-xl font-bold text-[#f5f1ea]">Cuándo abrimos</h3>

            <ul className="mt-4 space-y-3">
              {HORARIOS.map((h) => {
                const esHoy = h.dias === hoy;
                return (
                  <li key={h.dias} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={esHoy ? 'font-medium text-[#d97325]' : 'text-[#8f8479]'}>
                      {h.dias}
                      {/* Marcar el día de hoy ahorra el trabajo de buscarlo. */}
                      {esHoy && <span className="ml-1.5 text-xs">· hoy</span>}
                    </span>
                    <span className={esHoy ? 'text-[#f5f1ea]' : 'text-[#c9bfb2]'}>{h.horas}</span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 text-sm leading-relaxed text-[#8f8479]">
              Escríbenos antes y lo dejamos listo para que lo recojas sin cola.
            </p>
          </div>

          {/* --- Domicilios --- */}
          <div className="rounded-2xl border border-white/10 bg-[#1c1812] p-7">
            <span className="text-2xl" aria-hidden>
              🛵
            </span>
            <h3 className="mt-4 font-display text-xl font-bold text-[#f5f1ea]">A domicilio</h3>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#8f8479]">Envío</dt>
                <dd className="text-[#f5f1ea]">{precio(DOMICILIO.costoCOP)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#8f8479]">Tiempo</dt>
                <dd className="text-[#f5f1ea]">{DOMICILIO.minutos} min</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-[#8f8479]">Zonas</dt>
                <dd className="text-right text-[#c9bfb2]">{DOMICILIO.zonas}</dd>
              </div>
            </dl>

            {/* Se dice que recién hecho está mejor aunque juegue en contra del
                domicilio: quien lo descubre solo, después de pagar, no vuelve. */}
            <p className="mt-6 text-sm leading-relaxed text-[#8f8479]">
              El cono está en su mejor momento recién servido. Si puedes venir, ven.
            </p>

            <a
              href={enlaceWhatsApp('Hola, quiero pedir a domicilio. Mi dirección es:')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-medium text-[#f5f1ea] transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Pedir a domicilio
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
