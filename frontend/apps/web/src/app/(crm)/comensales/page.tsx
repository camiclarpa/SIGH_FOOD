import Link from 'next/link';
import { listarComensales, zonasConMomentos, DIAS_RIESGO, type CampoOrdenComensal } from '@/lib/consultas-b2c';
import { LINEAS_PRODUCTO, NIVELES, etiquetaNivel, lineaDominante } from '@/lib/fidelizacion';
import { Exportar } from '@/components/Exportar';
import { puede, rolActual } from '@/lib/permisos';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  tablaRFM,
  repartoPorSegmento,
  ETIQUETAS_SEGMENTO,
  type FilaRFM,
  type SegmentoRFM,
} from '@/lib/rfm';
import {
  AvisoDegradado,
  Etiqueta,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Comensales · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const ORDENES: CampoOrdenComensal[] = ['reciente', 'escaneos', 'puntos', 'alta', 'nombre'];

const ACTIVIDADES = [
  { valor: '', texto: 'Toda la actividad' },
  { valor: 'activos', texto: `Activos (${DIAS_RIESGO} días)` },
  { valor: 'riesgo', texto: 'En riesgo' },
  { valor: 'dormidos', texto: 'Dormidos' },
];

export default async function PaginaComensales({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const orden = ORDENES.includes(p.orden as CampoOrdenComensal) ? (p.orden as CampoOrdenComensal) : 'reciente';
  const pagina = Math.max(1, Number(p.pagina) || 1);

  const [comensales, listaZonas, rol, rfm] = await Promise.all([
    listarComensales({
      pagina,
      limite: 25,
      buscar: p.buscar?.trim() || undefined,
      nivel: p.nivel || undefined,
      linea: p.linea || undefined,
      zona: p.zona || undefined,
      actividad: p.actividad || undefined,
      orden,
    }),
    zonasConMomentos(),
    rolActual(),
    // RFM calculado, no adivinado. Ver lib/rfm.ts: el riesgo es "lleva más de
    // vez y media SU intervalo habitual sin pedir", no un número que devuelve
    // un modelo de lenguaje.
    conBaseDeDatos((db) => tablaRFM(db)).catch(() => [] as FilaRFM[]),
  ]);

  const reparto = repartoPorSegmento(rfm);
  // Los que más urgen arriba: primero por lo que gastaban, porque perder a
  // quien deja doscientos mil cuesta más que perder a quien deja treinta.
  const urgentes = rfm.filter((f) => f.enRiesgo).sort((a, b) => b.monetario - a.monetario).slice(0, 6);

  const { filas, paginacion } = comensales.datos;
  const zonas = listaZonas.datos;
  const degradado = comensales.degradado || listaZonas.degradado;
  const edadSegundos = comensales.edadSegundos ?? listaZonas.edadSegundos;

  /** Conserva los filtros al cambiar de página. */
  const enlacePagina = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
    q.set('pagina', String(n));
    return `/comensales?${q}`;
  };

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={<Exportar tabla="comensales" puedeExportar={puede(rol, 'datos.exportar')} />}>
        Comensales
      </Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        {numero(paginacion.total)} personas registradas, por el QR de la mesa o al pedir en la tienda.
      </p>

      {/*
        Quién vale y quién se está yendo, antes de la lista.

        La tabla de abajo sirve para buscar a alguien concreto; esto sirve para
        decidir a quién escribirle hoy, que es lo que hace que esta pantalla
        ayude a vender en vez de solo consultar.
      */}
      {rfm.length > 0 && (
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <Tarjeta className="lg:col-span-1">
            <h2 className="mb-3 font-semibold">Cómo está la cartera</h2>
            <ul className="space-y-2 text-sm">
              {(Object.keys(ETIQUETAS_SEGMENTO) as SegmentoRFM[])
                .filter((s) => reparto[s] > 0)
                .map((s) => (
                  <li key={s} className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Etiqueta tono={s === 'campeon' ? 'exito' : s === 'en_riesgo' || s === 'dormido' ? 'riesgo' : 'info'}>
                        {ETIQUETAS_SEGMENTO[s]}
                      </Etiqueta>
                    </span>
                    <span className="cifras font-medium">{numero(reparto[s])}</span>
                  </li>
                ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="lg:col-span-2">
            <h2 className="mb-1 font-semibold">A quién llamar hoy</h2>
            <p className="texto-suave mb-3 text-sm">
              Llevan más de vez y media su intervalo habitual sin pedir. Ordenados por lo que
              gastaban: perder a quien deja doscientos mil cuesta más que perder a quien deja treinta.
            </p>
            {urgentes.length === 0 ? (
              <Vacio>
                Nadie en riesgo ahora mismo. Hace falta al menos tres pedidos por persona para saber
                cada cuánto viene; con menos, decir que alguien «está en riesgo» sería inventarlo.
              </Vacio>
            ) : (
              <ul className="divide-y borde-tema">
                {urgentes.map((f) => (
                  <li key={f.consumerId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link
                        href={`/comensales/${f.consumerId}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {f.nombre ?? 'Sin nombre'}
                      </Link>
                      <p className="texto-suave cifras truncate text-xs">
                        {f.frecuencia} pedidos · suele venir cada {f.intervaloHabitual} días ·
                        lleva {f.recencia} sin pedir
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="cifras text-xs font-medium">
                        ${numero(f.monetario)}
                      </span>
                      <Etiqueta tono="riesgo">{f.retraso}× tarde</Etiqueta>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}

      {/*
        Formulario GET y no estado de cliente: así los filtros viven en la URL y
        se pueden compartir, marcar y recargar sin perderlos.
      */}
      <form method="get" className="superficie mb-4 grid gap-3 rounded-lg border borde-tema p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          type="search"
          name="buscar"
          defaultValue={p.buscar ?? ''}
          placeholder="Nombre, WhatsApp o email"
          className="superficie rounded-md border borde-tema px-3 py-2 text-sm sm:col-span-2"
        />

        <select name="nivel" defaultValue={p.nivel ?? ''} className="superficie rounded-md border borde-tema px-3 py-2 text-sm">
          <option value="">Todos los niveles</option>
          {NIVELES.map((n) => (
            <option key={n.nivel} value={n.nivel}>{n.etiqueta}</option>
          ))}
        </select>

        <select name="linea" defaultValue={p.linea ?? ''} className="superficie rounded-md border borde-tema px-3 py-2 text-sm">
          <option value="">Todas las líneas</option>
          {LINEAS_PRODUCTO.map((l) => (
            <option key={l.codigo} value={l.codigo}>{l.etiqueta}</option>
          ))}
        </select>

        <select name="zona" defaultValue={p.zona ?? ''} className="superficie rounded-md border borde-tema px-3 py-2 text-sm">
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        <select name="actividad" defaultValue={p.actividad ?? ''} className="superficie rounded-md border borde-tema px-3 py-2 text-sm">
          {ACTIVIDADES.map((a) => (
            <option key={a.valor} value={a.valor}>{a.texto}</option>
          ))}
        </select>

        <select name="orden" defaultValue={orden} className="superficie rounded-md border borde-tema px-3 py-2 text-sm">
          <option value="reciente">Actividad reciente</option>
          <option value="escaneos">Más momentos</option>
          <option value="puntos">Más puntos</option>
          <option value="alta">Alta más reciente</option>
          <option value="nombre">Nombre</option>
        </select>

        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Filtrar
        </button>
      </form>

      <Tarjeta>
        {filas.length === 0 ? (
          <Vacio>
            Ningún comensal coincide con estos filtros. Los comensales se registran solos
            al escanear el QR de la mesa.
          </Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Comensal</th>
                  <th className="pb-2 pr-3 font-medium">Nivel</th>
                  <th className="pb-2 pr-3 font-medium">Paladar</th>
                  <th className="pb-2 pr-3 text-right font-medium">Momentos</th>
                  <th className="pb-2 pr-3 text-right font-medium">Insignias</th>
                  <th className="pb-2 pr-3 text-right font-medium">Puntos</th>
                  <th className="pb-2 font-medium">Último</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {filas.map((c) => {
                  const dominante = lineaDominante(c.preferencias as Record<string, number> | null);
                  const escaneos = Number(c.escaneos ?? 0);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="py-2.5 pr-3">
                        <Link href={`/comensales/${c.id}`} className="font-medium hover:underline">
                          {c.nombre ?? 'Sin nombre'}
                        </Link>
                        <p className="texto-suave cifras text-xs">{c.whatsapp}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Etiqueta tono={escaneos >= 20 ? 'marca' : escaneos >= 5 ? 'info' : 'neutro'}>
                          {etiquetaNivel(c.nivel)}
                        </Etiqueta>
                      </td>
                      <td className="texto-suave py-2.5 pr-3 text-xs">{dominante ?? '—'}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(escaneos)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(Number(c.insignias ?? 0))}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(c.puntos ?? 0)}</td>
                      <td className="texto-suave py-2.5 text-xs">
                        {c.ultimoMomento ? desde(c.ultimoMomento as Date) : 'nunca'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {paginacion.paginas > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="texto-suave">
            Página {paginacion.pagina} de {paginacion.paginas}
          </span>
          <div className="flex gap-2">
            {paginacion.pagina > 1 && (
              <Link
                href={enlacePagina(paginacion.pagina - 1)}
                className="rounded-md border borde-tema px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Anterior
              </Link>
            )}
            {paginacion.pagina < paginacion.paginas && (
              <Link
                href={enlacePagina(paginacion.pagina + 1)}
                className="rounded-md border borde-tema px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
