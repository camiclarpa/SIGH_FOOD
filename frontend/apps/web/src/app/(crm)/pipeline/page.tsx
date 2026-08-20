import Link from 'next/link';
import { resumenPipeline } from '@/lib/consultas';
import { AvisoDegradado, ETAPAS, EtiquetaRiesgo, Titulo, numero } from '@/components/ui';

export const metadata = { title: 'Pipeline · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaPipeline() {
  const { datos: d, degradado, edadSegundos } = await resumenPipeline();

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo
        accion={<span className="texto-suave cifras text-sm">{numero(d.total)} clientes en total</span>}
      >
        Pipeline
      </Titulo>

      {/* Tablero horizontal: las 7 etapas no caben en pantalla, así que se
          desplaza dentro de su contenedor en vez de comprimir las columnas. */}
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {d.etapas.map((col) => {
            const meta = ETAPAS[col.etapa] ?? { texto: col.etapa, tono: 'neutro' as const };
            return (
              <section key={col.etapa} className="w-72 shrink-0">
                <header className="superficie mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
                  <h2 className="truncate text-sm font-semibold" title={meta.texto}>{meta.texto}</h2>
                  <span className="cifras shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                    {numero(col.total)}
                  </span>
                </header>

                <div className="space-y-2">
                  {col.cuentas.length === 0 ? (
                    <p className="texto-suave rounded-lg border border-dashed borde-tema px-3 py-6 text-center text-xs">
                      Sin clientes
                    </p>
                  ) : (
                    col.cuentas.map((c) => (
                      <Link
                        key={c.id}
                        href={`/clientes/${c.id}`}
                        className="superficie block rounded-lg border p-3 transition-shadow hover:shadow-md"
                      >
                        <p className="truncate text-sm font-medium">{c.nombre}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="texto-suave truncate text-xs">{c.zona}</span>
                          <EtiquetaRiesgo riesgo={c.riesgoChurn} />
                        </div>
                      </Link>
                    ))
                  )}

                  {/* La columna muestra hasta 8: si hay más, se dice cuántas
                      faltan en vez de dar a entender que eso es todo. */}
                  {col.total > col.cuentas.length && (
                    <Link
                      href={`/clientes?etapa=${col.etapa}`}
                      className="texto-suave block rounded-lg border border-dashed borde-tema px-3 py-2 text-center text-xs hover:underline"
                    >
                      Ver las {numero(col.total)} de esta etapa
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
