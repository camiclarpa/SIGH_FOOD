import Link from 'next/link';
import { resumenResenas } from '@/lib/consultas-b2c';
import { etiquetaLinea } from '@/lib/fidelizacion';
import { puede, rolActual } from '@/lib/permisos';
import { ResolverAlerta } from './ResolverAlerta';
import {
  AvisoDegradado,
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Reseñas · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/** Estrellas en texto: se leen en una tabla mejor que un número suelto. */
function estrellas(n: number | null): string {
  if (!n) return '—';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export default async function PaginaResenas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const soloAlertas = p.filtro === 'alertas';

  const [{ datos: d, degradado, edadSegundos }, rol] = await Promise.all([
    resumenResenas({ soloAlertas }),
    rolActual(),
  ]);

  const puedeModerar = puede(rol, 'resenas.moderar');

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Reseñas</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Lo que dice el comensal sobre el producto. La IA distingue una preferencia
        —&laquo;no me gusta el picante&raquo;— de un fallo de producción.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metrica etiqueta="Reseñas" valor={numero(d.totales.total)} />
        <Metrica
          etiqueta="Nota media"
          valor={Number(d.totales.media) > 0 ? Number(d.totales.media).toFixed(1) : '—'}
          detalle="sobre 5"
        />
        <Metrica
          etiqueta="Alertas de calidad"
          valor={numero(d.totales.alertas)}
          detalle="posibles fallos de tanda"
          tono={d.totales.alertas > 0 ? 'riesgo' : 'exito'}
        />
        <Metrica etiqueta="Negativas" valor={numero(d.totales.negativas)} tono={d.totales.negativas > 0 ? 'aviso' : 'neutro'} />
        <Metrica
          etiqueta="Sin analizar"
          valor={numero(d.totales.sinAnalizar)}
          detalle="pendientes de la IA"
          tono={d.totales.sinAnalizar > 0 ? 'aviso' : 'neutro'}
        />
      </div>

      {d.porLinea.length > 0 && (
        <div className="mt-6">
          <Tarjeta titulo="Por línea sensorial">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Línea</th>
                    <th className="pb-2 pr-3 text-right font-medium">Reseñas</th>
                    <th className="pb-2 pr-3 text-right font-medium">Media</th>
                    <th className="pb-2 text-right font-medium">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.porLinea.map((l) => (
                    <tr key={l.linea ?? 'sin-linea'}>
                      <td className="py-2 pr-3">{etiquetaLinea(l.linea)}</td>
                      <td className="cifras py-2 pr-3 text-right">{numero(l.total)}</td>
                      <td className="cifras py-2 pr-3 text-right">{Number(l.media).toFixed(1)}</td>
                      <td className={`cifras py-2 text-right ${Number(l.alertas) > 0 ? 'text-red-500' : ''}`}>
                        {numero(l.alertas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </div>
      )}

      <div className="mt-6">
        <Tarjeta
          titulo={soloAlertas ? 'Alertas de calidad' : 'Todas las reseñas'}
          accion={
            <div className="flex gap-2 text-xs">
              <Link
                href="/resenas"
                className={`rounded-md border px-3 py-1 ${soloAlertas ? 'borde-tema' : 'border-orange-500 text-orange-500'}`}
              >
                Todas
              </Link>
              <Link
                href="/resenas?filtro=alertas"
                className={`rounded-md border px-3 py-1 ${soloAlertas ? 'border-orange-500 text-orange-500' : 'borde-tema'}`}
              >
                Solo alertas
              </Link>
            </div>
          }
        >
          {d.filas.length === 0 ? (
            <Vacio>
              {soloAlertas
                ? 'Ninguna alerta de calidad abierta.'
                : 'Todavía no hay reseñas. Se recogen cuando el comensal valora lo que probó.'}
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.filas.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="cifras text-sm text-amber-500" title={`${r.puntuacion ?? '?'} de 5`}>
                          {estrellas(r.puntuacion)}
                        </span>
                        <span className="texto-suave text-xs">{etiquetaLinea(r.linea)}</span>

                        {r.sentimiento && (
                          <Etiqueta
                            tono={
                              r.sentimiento === 'positivo' ? 'exito'
                              : r.sentimiento === 'negativo' ? 'riesgo' : 'neutro'
                            }
                          >
                            {r.sentimiento}
                          </Etiqueta>
                        )}
                        {r.alertaCalidad && <Etiqueta tono="riesgo">alerta de calidad</Etiqueta>}
                        {!r.analizadaEn && <Etiqueta tono="aviso">sin analizar</Etiqueta>}
                      </div>

                      {r.comentario && <p className="mt-1.5 text-sm">{r.comentario}</p>}

                      {/* Los atributos los extrae la IA del texto libre. */}
                      {r.atributos && Object.keys(r.atributos).length > 0 && (
                        <p className="texto-suave mt-1 text-xs">
                          {Object.entries(r.atributos as Record<string, string>)
                            .filter(([k]) => !k.startsWith('_'))
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}

                      <p className="texto-suave mt-1 text-xs">
                        {r.comensalId ? (
                          <Link href={`/comensales/${r.comensalId}`} className="hover:underline">
                            {r.comensal ?? 'Sin nombre'}
                          </Link>
                        ) : 'Anónimo'}
                        {r.bar ? ` · ${r.bar}` : ''}
                        {r.zona ? ` · ${r.zona}` : ''}
                        {` · ${desde(r.fecha)}`}
                      </p>
                    </div>

                    {r.alertaCalidad && <ResolverAlerta id={r.id} puedeModerar={puedeModerar} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
