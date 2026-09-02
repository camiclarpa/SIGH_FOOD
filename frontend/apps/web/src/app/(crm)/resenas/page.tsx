import Link from 'next/link';
import { resumenResenas } from '@/lib/consultas-b2c';
import { etiquetaLinea } from '@/lib/fidelizacion';
import { puede, rolActual } from '@/lib/permisos';
import { ResolverAlerta } from './ResolverAlerta';
import { CompensarComensal } from './CompensarComensal';
import { AltaLote, RetirarLote } from './Lotes';
import { lotesConCalidad, mediasPorAtributo, repartoPorCategoria } from '@/lib/calidad';
import { catalogoSimple } from '@/lib/calidad-catalogo';
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

/**
 * Como se lee cada categoria en pantalla.
 *
 * Se separan los dos fallos porque se arreglan en sitios distintos: uno en la
 * cocina y otro en el reparto. Y 'preferencia' NO se pinta como problema — no lo
 * es: dice que el producto salio como debia y que a esa persona no le gusto.
 */
const ETIQUETA_CATEGORIA: Record<string, string> = {
  fallo_cocina: 'fallo de cocina',
  fallo_logistica: 'fallo de reparto',
  preferencia: 'preferencia',
  elogio: 'elogio',
  sugerencia: 'sugerencia de producto',
};

const TONO_CATEGORIA: Record<string, 'riesgo' | 'aviso' | 'neutro' | 'exito' | 'info'> = {
  fallo_cocina: 'riesgo',
  fallo_logistica: 'aviso',
  preferencia: 'neutro',
  elogio: 'exito',
  sugerencia: 'info',
};

/** Los motivos de un toque, como se le ensenaron a la persona. */
const ETIQUETA_MOTIVO: Record<string, string> = {
  temperatura: 'llego frio',
  tiempo: 'tardo mucho',
  empaque: 'el empaque',
  sabor: 'el sabor',
  cantidad: 'la cantidad',
  otro: 'otra cosa',
};

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

  const [{ datos: d, degradado, edadSegundos }, rol, atributos, tandas, reparto, productos] =
    await Promise.all([
      resumenResenas({ soloAlertas }),
      rolActual(),
      mediasPorAtributo(),
      lotesConCalidad(),
      repartoPorCategoria(),
      catalogoSimple(),
    ]);

  const tandasEnAlerta = tandas.filter((t) => t.estado.alerta && !t.retirado).length;
  const tandasVivas = tandas.filter((t) => !t.retirado).length;

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
        {/*
          La cifra que separa lo que hay que ARREGLAR de lo que solo hay que
          ESCUCHAR.

          Un cliente al que no le gusta el picante no es un defecto de
          fabricación. Contarlo como tal lleva a suavizar un producto que a los
          demás les gusta justo así, y a perseguir un problema que no existe.
        */}
        <Metrica
          etiqueta="Defectos reales"
          valor={numero(reparto.defectos)}
          detalle={`${numero(reparto.subjetivas)} son preferencia o sugerencia`}
          tono={reparto.defectos > 0 ? 'riesgo' : 'exito'}
        />
        <Metrica
          etiqueta="Tandas en revisión"
          valor={`${numero(tandasEnAlerta)} / ${numero(tandasVivas)}`}
          detalle={tandasEnAlerta > 0 ? 'superan el umbral de quejas' : 'ninguna con incidencias'}
          tono={tandasEnAlerta > 0 ? 'riesgo' : 'exito'}
        />
      </div>

      {/* --- Atributos: a quién le toca arreglarlo --- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Cómo puntúan cada cosa">
          <p className="texto-suave -mt-2 mb-3 text-xs">
            Una nota global de 3 no dice nada. «Buenísimo pero llegó blando» y «crujiente
            pero soso» son las mismas 3 y se arreglan en sitios distintos.
          </p>
          <ul className="divide-y borde-tema">
            {atributos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm">{a.etiqueta}</p>
                  <p className="texto-suave text-xs">{a.responsable}</p>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span
                    className={`cifras text-sm font-medium ${
                      a.media !== null && a.media < 3.5 ? 'text-red-500' : ''
                    }`}
                  >
                    {a.media !== null ? a.media.toFixed(1) : '—'}
                  </span>
                  <span className="texto-suave text-xs">
                    {a.respuestas > 0 ? `${numero(a.respuestas)} resp.` : 'sin datos'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="De qué hablan las reseñas">
          <p className="texto-suave -mt-2 mb-3 text-xs">
            Las sugerencias son la única categoría que dice qué fabricar después.
          </p>
          <ul className="divide-y borde-tema">
            {[
              { t: 'Elogios', v: reparto.elogio, tono: 'exito' as const },
              { t: 'Fallo de cocina', v: reparto.falloCocina, tono: 'riesgo' as const },
              { t: 'Fallo de reparto', v: reparto.falloLogistica, tono: 'aviso' as const },
              { t: 'Preferencia personal', v: reparto.preferencia, tono: 'neutro' as const },
              { t: 'Sugerencia de producto', v: reparto.sugerencia, tono: 'info' as const },
              { t: 'Sin clasificar', v: reparto.sinClasificar, tono: 'neutro' as const },
            ].map((f) => (
              <li key={f.t} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>{f.t}</span>
                <span className="cifras">{numero(f.v)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      {/* --- Trazabilidad por tanda --- */}
      <div className="mt-6">
        <Tarjeta
          titulo="Control por lote"
          accion={puedeModerar ? <AltaLote productos={productos} /> : null}
        >
          <p className="texto-suave -mt-2 mb-3 text-xs">
            Tres quejas repartidas en tres tandas es ruido. Tres quejas del mismo código
            impreso es una tanda que hay que sacar de circulación.
          </p>

          {tandas.length === 0 ? (
            <Vacio>
              Todavía no hay lotes dados de alta. Sin ellos, una reseña dice qué pasó pero no
              a qué producción le pasó.
            </Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Lote</th>
                    <th className="pb-2 pr-3 font-medium">Producto</th>
                    <th className="pb-2 pr-3 text-right font-medium">Reseñas</th>
                    <th className="pb-2 pr-3 text-right font-medium">Media</th>
                    <th className="pb-2 pr-3 text-right font-medium">Quejas</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {tandas.map((t) => (
                    <tr key={t.id} className={t.retirado ? 'opacity-55' : ''}>
                      <td className="py-2.5 pr-3">
                        <span className="cifras font-medium">{t.codigo}</span>
                        <span className="texto-suave block text-xs">{t.producidoEn}</span>
                      </td>
                      <td className="py-2.5 pr-3">{t.producto ?? 'Tanda mixta'}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(t.resenas)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">
                        {t.resenas > 0 ? t.media.toFixed(1) : '—'}
                      </td>
                      <td
                        className={`cifras py-2.5 pr-3 text-right ${
                          t.negativas > 0 ? 'text-red-500' : ''
                        }`}
                      >
                        {numero(t.negativas)}
                      </td>
                      <td className="py-2.5 pr-3">
                        {t.retirado ? (
                          <>
                            <Etiqueta tono="neutro">retirada</Etiqueta>
                            {t.motivoRetiro && (
                              <span className="texto-suave block text-xs">{t.motivoRetiro}</span>
                            )}
                          </>
                        ) : t.estado.alerta ? (
                          <>
                            <Etiqueta tono="riesgo">revisar</Etiqueta>
                            <span className="texto-suave block text-xs">{t.estado.motivo}</span>
                          </>
                        ) : (
                          <span className="texto-suave text-xs">{t.estado.motivo}</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        {puedeModerar && (
                          <RetirarLote id={t.id} codigo={t.codigo} retirado={t.retirado} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
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
                className={`rounded-md border px-3 py-1 ${soloAlertas ? 'borde-tema' : 'border-indigo-500 text-indigo-500'}`}
              >
                Todas
              </Link>
              <Link
                href="/resenas?filtro=alertas"
                className={`rounded-md border px-3 py-1 ${soloAlertas ? 'border-indigo-500 text-indigo-500' : 'borde-tema'}`}
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

                        {/*
                          La causa raíz. Es lo que convierte una nota en algo
                          accionable: "llegó frío" y "no me gusta el picante" son
                          la misma nota y problemas opuestos — el primero se
                          arregla en reparto y el segundo no se arregla.
                        */}
                        {r.categoria && (
                          <Etiqueta tono={TONO_CATEGORIA[r.categoria]}>
                            {ETIQUETA_CATEGORIA[r.categoria]}
                          </Etiqueta>
                        )}

                        {!r.analizadaEn && <Etiqueta tono="aviso">sin analizar</Etiqueta>}
                      </div>

                      {/* Lo que marcó de un toque, antes de escribir nada. */}
                      {r.motivos && r.motivos.length > 0 && (
                        <p className="texto-suave mt-1.5 text-xs">
                          Marcó: {r.motivos.map((m) => ETIQUETA_MOTIVO[m] ?? m).join(' · ')}
                        </p>
                      )}

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

                    {r.alertaCalidad && (
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ResolverAlerta id={r.id} puedeModerar={puedeModerar} />
                        <CompensarComensal reviewId={r.id} consumerId={r.comensalId} puedeModerar={puedeModerar} />
                      </div>
                    )}
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
