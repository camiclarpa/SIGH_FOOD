import Link from 'next/link';
import { analiticaMomentos } from '@/lib/consultas-b2c';
import { conversionAPedido, pendientesDeRecuperar } from '@/lib/momentos-embudo';
import { franjaDeMayorActividad } from '@/lib/momentos-franja';
import { etiquetaLinea } from '@/lib/fidelizacion';
import { Exportar } from '@/components/Exportar';
import { puede, rolActual } from '@/lib/permisos';
import {
  AvisoDegradado,
  Barra,
  Etiqueta,
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

const ETIQUETA_CANAL: Record<string, string> = {
  horeca: 'En bar o restaurante',
  hogar: 'En casa, de una bolsa',
  evento: 'En un evento',
};

const ETIQUETA_MARIDAJE: Record<string, string> = {
  cerveza: 'Con cerveza',
  vino: 'Con vino',
  cafe: 'Con café',
  solo: 'Solo, sin acompañar',
};

/**
 * "Hace X minutos", para el feed en vivo.
 *
 * `desde()` —el formateador compartido del CRM— responde en días ("hoy",
 * "ayer"), que es lo correcto para una ficha de comensal pero inútil en un feed
 * que se mira minuto a minuto: todo lo de la última hora diría igual "hoy".
 */
function haceCuanto(fecha: string | Date | null): string {
  if (!fecha) return '—';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const minutos = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

export default async function PaginaMomentos() {
  const [{ datos: d, degradado, edadSegundos }, rol, embudo, franja, pendientes] = await Promise.all([
    analiticaMomentos(),
    rolActual(),
    conversionAPedido(),
    franjaDeMayorActividad(),
    pendientesDeRecuperar(),
  ]);

  const maxHora = Math.max(1, ...Object.values(d.porHora));
  const maxDia = Math.max(1, ...Object.values(d.porDia));
  const totalRecurrencia = d.recurrencia.reduce((s, r) => s + Number(r.comensales), 0);
  const unaVez = Number(d.recurrencia.find((r) => r.tramo === '1')?.comensales ?? 0);

  const tasaCompartido =
    d.totales.momentos > 0 ? Math.round((Number(d.totales.compartidos) / d.totales.momentos) * 100) : 0;

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={<Exportar tabla="momentos" puedeExportar={puede(rol, 'datos.exportar')} />}>
        Momentos sensoriales
      </Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        La experiencia de consumo en tiempo real: de la mesa al hogar. De dónde vienen, cuándo
        ocurren y quién vuelve.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Momentos" valor={numero(d.totales.momentos)} />
        <Metrica etiqueta="Comensales" valor={numero(d.totales.comensales)} detalle="personas distintas" />
        <Metrica
          etiqueta="En casa"
          valor={numero(d.totales.enHogar)}
          detalle="desde una bolsa comprada, sin bar de por medio"
        />
        <Metrica
          etiqueta="Solo una vez"
          valor={totalRecurrencia === 0 ? '—' : `${Math.round((unaVez / totalRecurrencia) * 100)}%`}
          detalle={`${numero(unaVez)} no volvieron`}
          tono={totalRecurrencia > 0 && unaVez / totalRecurrencia > 0.7 ? 'riesgo' : 'aviso'}
        />
      </div>

      {/*
        El embudo real de "escanear a comprar".

        No existe un estado "anónimo" en este sistema —el teléfono se pide
        desde el propio escaneo—, así que la métrica que sí tiene sentido es
        esta: de quien solo escanea, cuántos acaban comprando directo.
      */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="De escanear a comprar" className="sm:col-span-2 lg:col-span-2">
          {embudo.escanearon === 0 ? (
            <Vacio>Nadie ha escaneado todavía.</Vacio>
          ) : (
            <div className="flex items-center gap-6">
              <div>
                <p className="cifras text-3xl font-semibold">{embudo.tasa}%</p>
                <p className="texto-suave text-xs">
                  {numero(embudo.compraron)} de {numero(embudo.escanearon)} compraron directo
                </p>
              </div>
              {embudo.diasMedianaHastaCompra !== null && (
                <div className="border-l borde-tema pl-6">
                  <p className="cifras text-2xl font-semibold">{embudo.diasMedianaHastaCompra}</p>
                  <p className="texto-suave text-xs">días de mediana hasta el primer pedido</p>
                </div>
              )}
            </div>
          )}
        </Tarjeta>

        <Metrica
          etiqueta="Comparten lo que prueban"
          valor={`${tasaCompartido}%`}
          detalle={`${numero(d.totales.compartidos)} momentos compartidos`}
        />

        <Metrica
          etiqueta="Hora de mayor consumo"
          valor={franja.hora !== null ? `${String(franja.hora).padStart(2, '0')}:00` : '—'}
          detalle={
            franja.hora === null
              ? 'sin datos todavía'
              : franja.confiable
                ? `${numero(franja.momentos)} momentos en esa hora`
                : `${numero(franja.momentos)} momentos — muestra corta aún`
          }
          tono={franja.hora !== null && !franja.confiable ? 'aviso' : 'neutro'}
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

      {/*
        Canal y maridaje: el contexto del consumo, no solo el conteo.

        Un pico a las seis de la tarde significa una cosa en un bar y otra en
        casa. Sin separarlos, los dos caían en la misma barra del gráfico y
        ninguno de los dos se podía leer con confianza.
      */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Dónde se consume">
          {d.porCanal.length === 0 ? (
            <Vacio>Sin momentos registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porCanal.map((c) => {
                const pct = d.totales.momentos === 0 ? 0 : Math.round((Number(c.total) / d.totales.momentos) * 100);
                return (
                  <li key={c.canal ?? 'sin-canal'}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{ETIQUETA_CANAL[c.canal ?? ''] ?? 'Sin especificar'}</span>
                      <span className="cifras texto-suave">{numero(c.total)} · {pct}%</span>
                    </div>
                    <Barra porcentaje={pct} tono={c.canal === 'hogar' ? 'exito' : 'marca'} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Con qué lo acompañan">
          {d.porMaridaje.length === 0 ? (
            <Vacio>Nadie ha respondido todavía a la pregunta del maridaje.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porMaridaje.map((m) => {
                const totalConMaridaje = d.porMaridaje.reduce((s, x) => s + Number(x.total), 0);
                const pct = totalConMaridaje === 0 ? 0 : Math.round((Number(m.total) / totalConMaridaje) * 100);
                return (
                  <li key={m.maridaje ?? 'sin-maridaje'}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{ETIQUETA_MARIDAJE[m.maridaje ?? ''] ?? m.maridaje}</span>
                      <span className="cifras texto-suave">{numero(m.total)} · {pct}%</span>
                    </div>
                    <Barra porcentaje={pct} tono="info" />
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
        <Tarjeta titulo="Feed en vivo">
          {d.ultimos.length === 0 ? (
            <Vacio>Sin actividad. Los momentos entran al escanear un QR, en mesa o en una bolsa.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Comensal</th>
                    <th className="pb-2 pr-3 font-medium">Producto</th>
                    <th className="pb-2 pr-3 font-medium">Maridaje</th>
                    <th className="pb-2 pr-3 font-medium">Dónde</th>
                    <th className="pb-2 font-medium">Hace</th>
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
                          <span className="texto-suave">Sin registrar</span>
                        )}
                        <p className="texto-suave cifras text-xs">{m.whatsapp}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        {etiquetaLinea(m.linea)}
                        {m.lote && <p className="texto-suave cifras text-xs">Lote {m.lote}</p>}
                      </td>
                      <td className="py-2.5 pr-3">
                        {m.maridaje ? (ETIQUETA_MARIDAJE[m.maridaje] ?? m.maridaje) : (
                          <span className="texto-suave">—</span>
                        )}
                        {m.compartido && (
                          <span className="ml-1.5 inline-block">
                            <Etiqueta tono="info">compartido</Etiqueta>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {ETIQUETA_CANAL[m.canal ?? ''] ?? m.canal}
                        {m.bar && <p className="texto-suave text-xs">{m.bar}</p>}
                      </td>
                      <td className="texto-suave cifras py-2.5 text-xs">{haceCuanto(m.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      {/*
        A quién recuperar. No es una automatización silenciosa: se enseña la
        lista para que quien opera pueda ver a quién le va a llegar el mensaje
        de "tu momento te está esperando" antes de que salga por el cron.
      */}
      {pendientes.length > 0 && (
        <div className="mt-6">
          <Tarjeta
            titulo="Sin escanear hace más de 21 días"
            accion={<Etiqueta tono="aviso">{numero(pendientes.length)}</Etiqueta>}
          >
            <p className="texto-suave -mt-2 mb-3 text-xs">
              Dejaron de registrar un momento, aunque puedan seguir comprando por la tienda. La
              secuencia con disparador &laquo;Sin escanear hace 21 días&raquo; les llega si está
              activa.
            </p>
            <ul className="divide-y borde-tema">
              {pendientes.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/comensales/${p.id}`} className="min-w-0 truncate hover:underline">
                    {p.nombre ?? p.telefono}
                  </Link>
                  <span className="texto-suave shrink-0 text-xs">{desde(p.ultimoMomento)}</span>
                </li>
              ))}
            </ul>
            {pendientes.length > 10 && (
              <p className="texto-suave mt-2 text-xs">y {numero(pendientes.length - 10)} más</p>
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
