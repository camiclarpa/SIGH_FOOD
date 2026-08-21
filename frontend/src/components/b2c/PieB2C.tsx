/**
 * ============================================================================
 * Pie de página
 * ============================================================================
 *
 * Información secundaria, pero no información de relleno: quien baja hasta aquí
 * suele venir buscando una cosa concreta —el WhatsApp, el horario o dónde
 * están— y debería encontrarla sin volver a subir.
 *
 * El enlace a la parte B2B vive aquí y no en el menú a propósito. Esta página
 * es para el cliente final; un dueño de bar que busque la propuesta comercial
 * sabe buscar, pero un comensal no debería tropezarse con ella a mitad de la
 * decisión de compra.
 */

import { HORARIOS, LOCAL, MARCA, enlaceWhatsApp } from './datos';

export default function PieB2C() {
  const año = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0d0b09] px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* --- Marca --- */}
          <div>
            <p className="font-display text-2xl font-bold text-[#f5f1ea]">
              {MARCA.nombre}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#8f8479]">
              Conos crujientes rellenos al momento. Cinco sabores, ninguno
              parecido al otro.
            </p>
          </div>

          {/* --- Contacto --- */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#c9bfb2]">
              Escríbenos
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={enlaceWhatsApp('Hola, quiero pedir un cono.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8f8479] transition-colors hover:text-[#d97325]"
                >
                  WhatsApp · {MARCA.whatsappVisible}
                </a>
              </li>
              <li>
                <a
                  href={`https://instagram.com/${MARCA.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8f8479] transition-colors hover:text-[#d97325]"
                >
                  Instagram · @{MARCA.instagram}
                </a>
              </li>
            </ul>
          </div>

          {/* --- Horarios --- */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#c9bfb2]">
              Dónde y cuándo
            </h3>

            <address className="mt-4 text-sm not-italic leading-relaxed">
              <a
                href={LOCAL.mapa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8f8479] transition-colors hover:text-[#d97325]"
              >
                {LOCAL.direccion}
                <br />
                {LOCAL.zona}, {LOCAL.ciudad}
              </a>
            </address>

            <ul className="mt-4 space-y-2.5 text-sm text-[#8f8479]">
              {HORARIOS.map((h) => (
                <li key={h.dias}>
                  <span className="block text-[#c9bfb2]">{h.dias}</span>
                  {h.horas}
                </li>
              ))}
            </ul>
          </div>

          {/* --- Legal --- */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#c9bfb2]">
              Más
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#sabores" className="text-[#8f8479] transition-colors hover:text-[#d97325]">
                  Los sabores
                </a>
              </li>
              <li>
                <a href="#donde" className="text-[#8f8479] transition-colors hover:text-[#d97325]">
                  Cómo llegar
                </a>
              </li>
              <li>
                <a href="#preguntas" className="text-[#8f8479] transition-colors hover:text-[#d97325]">
                  Preguntas frecuentes
                </a>
              </li>
              <li>
                <a href="/b2b" className="text-[#8f8479] transition-colors hover:text-[#d97325]">
                  ¿Tienes un bar? Habla con nosotros
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 text-xs text-[#5f574d] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {año} {MARCA.nombre} · {MARCA.ciudad}, Colombia
          </p>
          <p>Las imágenes corresponden a los productos reales.</p>
        </div>
      </div>
    </footer>
  );
}
