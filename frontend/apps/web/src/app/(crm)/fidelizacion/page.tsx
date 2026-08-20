import Link from 'next/link';
import { resumenFidelizacion } from '@/lib/consultas-b2c';
import { etiquetaNivel } from '@/lib/fidelizacion';
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

export const metadata = { title: 'Fidelización · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const CRITERIOS: Record<string, string> = {
  escaneos_totales: 'Momentos acumulados',
  lineas_distintas: 'Líneas probadas',
  bares_distintos: 'Bares visitados',
  escaneos_en_franja: 'Franja horaria',
  racha_semanas: 'Semanas seguidas',
  referidos_convertidos: 'Referidos',
};

const ESTADOS_DESAFIO: Record<string, 'exito' | 'aviso' | 'neutro'> = {
  activo: 'exito',
  pausado: 'aviso',
  borrador: 'neutro',
  finalizado: 'neutro',
};

export default async function PaginaFidelizacion() {
  const { datos: d, degradado, edadSegundos } = await resumenFidelizacion();

  const enCirculacion = d.puntos.emitidos - d.puntos.canjeados;

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Fidelización</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Insignias, billetera de puntos y desafíos en mesa.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Puntos emitidos" valor={numero(d.puntos.emitidos)} tono="marca" />
        <Metrica etiqueta="Puntos canjeados" valor={numero(d.puntos.canjeados)} />
        <Metrica
          etiqueta="En circulación"
          valor={numero(enCirculacion)}
          detalle="pendientes de canjear"
          tono={enCirculacion > 0 ? 'info' : 'neutro'}
        />
        <Metrica etiqueta="Movimientos" valor={numero(d.puntos.movimientos)} detalle="asientos en la billetera" />
      </div>

      <div className="mt-6">
        <Tarjeta titulo={`Catálogo de insignias (${d.insignias.length})`}>
          {d.insignias.length === 0 ? (
            <Vacio>
              No hay insignias definidas. Ejecuta{' '}
              <code className="cifras">node scripts/sembrar-b2c.mjs</code> para crear el catálogo inicial.
            </Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Insignia</th>
                    <th className="pb-2 pr-3 font-medium">Se gana por</th>
                    <th className="pb-2 pr-3 text-right font-medium">Umbral</th>
                    <th className="pb-2 pr-3 text-right font-medium">Puntos</th>
                    <th className="pb-2 pr-3 text-right font-medium">Otorgadas</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.insignias.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white"
                          >
                            {b.icono}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{b.nombre}</p>
                            <p className="texto-suave truncate text-xs">{b.descripcion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="texto-suave py-2.5 pr-3 text-xs">
                        {CRITERIOS[b.criterio] ?? b.criterio}
                        {b.parametro && <span className="cifras"> ({b.parametro}h)</span>}
                      </td>
                      <td className="cifras py-2.5 pr-3 text-right">{b.umbral}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(b.puntosOtorgados)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(b.otorgadas)}</td>
                      <td className="py-2.5">
                        <Etiqueta tono={b.activa ? 'exito' : 'neutro'}>
                          {b.activa ? 'activa' : 'inactiva'}
                        </Etiqueta>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Comensales con más puntos">
          {d.topComensales.length === 0 ? (
            <Vacio>Sin comensales registrados.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.topComensales.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="texto-suave cifras w-4 shrink-0 text-xs">{i + 1}</span>
                    <div className="min-w-0">
                      <Link href={`/comensales/${c.id}`} className="block truncate font-medium hover:underline">
                        {c.nombre ?? 'Sin nombre'}
                      </Link>
                      <p className="texto-suave text-xs">
                        {etiquetaNivel(c.nivel)} · {numero(Number(c.insignias))} insignias
                      </p>
                    </div>
                  </div>
                  <span className="cifras shrink-0 font-medium">{numero(c.puntos ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Desafíos en mesa">
          {d.desafios.length === 0 ? (
            <Vacio>
              Sin desafíos creados. Son dinámicas rápidas de tres preguntas que el comensal
              responde en la mesa a cambio de puntos o un premio inmediato.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.desafios.map((c) => (
                <li key={c.id} className="py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.titulo}</p>
                      <p className="texto-suave text-xs">
                        {c.preguntas.length} pregunta{c.preguntas.length === 1 ? '' : 's'} ·{' '}
                        {numero(c.puntosPremio)} puntos
                        {c.premioDescripcion ? ` · ${c.premioDescripcion}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Etiqueta tono={ESTADOS_DESAFIO[c.estado] ?? 'neutro'}>{c.estado}</Etiqueta>
                      <p className="texto-suave cifras mt-1 text-xs">{numero(c.respuestas)} respuestas</p>
                    </div>
                  </div>
                  {c.createdAt && (
                    <p className="texto-suave mt-1 text-xs">Creado {desde(c.createdAt)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
