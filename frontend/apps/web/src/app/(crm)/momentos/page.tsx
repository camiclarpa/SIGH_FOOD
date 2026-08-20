import Link from 'next/link';
import { analiticaMomentos } from '@/lib/consultas-b2c';
import { etiquetaLinea } from '@/lib/fidelizacion';
import {
  AvisoDegradado,
  Barra,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Momentos · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/** Postgres devuelve 0 = domingo en EXTRACT(DOW). */
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Tramos del tramo de recurrencia, en el orden en que se leen. */
const TRAMOS = ['1', '2-4', '5-9', '10+'];

export default async function PaginaMomentos() {
  const { datos: d, degradado, edadSegundos } = await analiticaMomentos();

  const maxHora = Math.max(1, ...Object.values(d.porHora));
  const maxDia = Math.max(1, ...Object.values(d.porDia));
  const totalRecurrencia = d.recurrencia.reduce((s, r) => s + Number(r.comensales), 0);
  const unaVez = Number(d.recurrencia.find((r) => r.tramo === '1')?.comensales ?? 0);

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Momentos sensoriales</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Cada escaneo de QR en la mesa. De dónde vienen, cuándo ocurren y quién repite.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Momentos" valor={numero(d.totales.momentos)} />
        <Metrica etiqueta="Comensales" valor={numero(d.totales.comensales)} detalle="personas distintas" />
        <Metrica etiqueta="Bares activos" valor={numero(d.totales.bares)} detalle="con al menos un escaneo" />
        <Metrica
          etiqueta="Solo una vez"
          valor={totalRecurrencia === 0 ? '—' : `${Math.round((unaVez / totalRecurrencia) * 100)}%`}
          detalle={`${numero(unaVez)} no volvieron`}
          tono={totalRecurrencia > 0 && unaVez / totalRecurrencia > 0.7 ? 'riesgo' : 'aviso'}
        />
      </div>

      {/*
        La recurrencia es el diagnóstico del programa: si casi todos están en el
        tramo "1", el QR capta pero no fideliza, y el resto de métricas dan igual.
      */}
      <div className="mt-6">
        <Tarjeta titulo="Recurrencia: cuántas veces vuelve cada comensal">
          {totalRecurrencia === 0 ? (
            <Vacio>Aún no hay momentos registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {TRAMOS.map((tramo) => {
                const n = Number(d.recurrencia.find((r) => r.tramo === tramo)?.comensales ?? 0);
                const pct = Math.round((n / totalRecurrencia) * 100);
                return (
                  <li key={tramo}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{tramo === '1' ? '1 momento' : `${tramo} momentos`}</span>
                      <span className="cifras texto-suave">{numero(n)} · {pct}%</span>
                    </div>
                    <Barra porcentaje={pct} tono={tramo === '1' ? 'riesgo' : tramo === '10+' ? 'exito' : 'marca'} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* --- Mapa de calor: hora --- */}
        <Tarjeta titulo="Por hora del día">
          {Object.keys(d.porHora).length === 0 ? (
            <Vacio>Sin datos horarios todavía.</Vacio>
          ) : (
            <div className="flex items-end gap-1" style={{ height: '9rem' }}>
              {Array.from({ length: 24 }, (_, h) => {
                const n = d.porHora[h] ?? 0;
                // Altura mínima visible para las horas con 0: una barra ausente
                // se confunde con un hueco en el eje.
                const alto = n === 0 ? 2 : Math.max(6, Math.round((n / maxHora) * 100));
                return (
                  <div key={h} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-sm ${n === 0 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-orange-500'}`}
                      style={{ height: `${alto}%` }}
                      title={`${h}:00 — ${n} momento${n === 1 ? '' : 's'}`}
                    />
                    {h % 6 === 0 && <span className="texto-suave text-[10px]">{h}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </Tarjeta>

        {/* --- Mapa de calor: día --- */}
        <Tarjeta titulo="Por día de la semana">
          {Object.keys(d.porDia).length === 0 ? (
            <Vacio>Sin datos semanales todavía.</Vacio>
          ) : (
            <ul className="space-y-3">
              {DIAS.map((etiqueta, i) => {
                const n = d.porDia[i] ?? 0;
                return (
                  <li key={etiqueta}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{etiqueta}</span>
                      <span className="cifras texto-suave">{numero(n)}</span>
                    </div>
                    <Barra porcentaje={Math.round((n / maxDia) * 100)} tono="info" />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Por línea sensorial">
          {d.porLinea.length === 0 ? (
            <Vacio>Sin momentos registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porLinea.map((l) => {
                const pct = d.totales.momentos === 0 ? 0 : Math.round((Number(l.total) / d.totales.momentos) * 100);
                return (
                  <li key={l.linea ?? 'sin-linea'}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{etiquetaLinea(l.linea)}</span>
                      <span className="cifras texto-suave">{numero(l.total)} · {pct}%</span>
                    </div>
                    <Barra porcentaje={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Bares con más actividad">
          {d.porBar.length === 0 ? (
            <Vacio>Ningún bar registra escaneos todavía.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.porBar.map((b, i) => (
                <li key={`${b.bar}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.bar}</p>
                    <p className="texto-suave truncate text-xs">{b.zona}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="cifras text-sm">{numero(b.total)}</span>
                    <p className="texto-suave text-xs">{numero(b.comensales)} comensales</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta titulo="Últimos momentos">
          {d.ultimos.length === 0 ? (
            <Vacio>Sin actividad. Los momentos entran cuando alguien escanea el QR de una mesa.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Comensal</th>
                    <th className="pb-2 pr-3 font-medium">Línea</th>
                    <th className="pb-2 pr-3 font-medium">Bar</th>
                    <th className="pb-2 font-medium">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.ultimos.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 pr-3">
                        {m.comensalId ? (
                          <Link href={`/comensales/${m.comensalId}`} className="hover:underline">
                            {m.comensal ?? 'Sin nombre'}
                          </Link>
                        ) : (
                          <span className="texto-suave">Anónimo</span>
                        )}
                        <p className="texto-suave cifras text-xs">{m.whatsapp}</p>
                      </td>
                      <td className="py-2.5 pr-3">{etiquetaLinea(m.linea)}</td>
                      <td className="py-2.5 pr-3">
                        {m.bar ?? '—'}
                        <p className="texto-suave text-xs">{m.zona}</p>
                      </td>
                      <td className="texto-suave py-2.5 text-xs">{desde(m.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
