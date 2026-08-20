import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pasaporteComensal } from '@/lib/consultas-b2c';
import {
  etiquetaLinea,
  etiquetaNivel,
  perfilPaladar,
  progresoNivel,
} from '@/lib/fidelizacion';
import {
  AvisoDegradado,
  Barra,
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  fecha,
  numero,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

/** Franjas del día, para leer el hábito horario sin pintar 24 barras. */
const FRANJAS = [
  { etiqueta: 'Madrugada', desde: 0, hasta: 5 },
  { etiqueta: 'Mañana', desde: 6, hasta: 11 },
  { etiqueta: 'Mediodía', desde: 12, hasta: 15 },
  { etiqueta: 'Tarde', desde: 16, hasta: 19 },
  { etiqueta: 'Noche', desde: 20, hasta: 23 },
];

export default async function PaginaPasaporte({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { datos, degradado, edadSegundos } = await pasaporteComensal(id);

  if (!datos) notFound();

  const { comensal, historial, insigniasObtenidas, catalogo, movimientos, consentimientos, resenas, porHora, metricas } = datos;

  const paladar = perfilPaladar(comensal.flavorPreference as Record<string, number> | null);
  const progreso = progresoNivel(metricas.escaneos);
  const obtenidas = new Set(insigniasObtenidas.map((i) => i.codigo));
  const totalPorHora = Object.values(porHora).reduce((s, n) => s + n, 0);

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo
        accion={
          <Link href="/comensales" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
            Volver
          </Link>
        }
      >
        {comensal.fullName ?? 'Comensal sin nombre'}
      </Titulo>

      <div className="texto-suave -mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="cifras">{comensal.whatsappPhone}</span>
        {comensal.email && <span>{comensal.email}</span>}
        <Etiqueta tono={metricas.escaneos >= 20 ? 'marca' : metricas.escaneos >= 5 ? 'info' : 'neutro'}>
          {etiquetaNivel(comensal.membershipTier)}
        </Etiqueta>
        {comensal.referralCode && (
          <span className="cifras text-xs">Código: {comensal.referralCode}</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Momentos" valor={numero(metricas.escaneos)} detalle="productos probados" />
        <Metrica etiqueta="Bares visitados" valor={numero(metricas.baresDistintos)} />
        <Metrica etiqueta="Líneas probadas" valor={`${metricas.lineasDistintas} / 5`} />
        <Metrica etiqueta="Puntos" valor={numero(comensal.points ?? 0)} tono="marca" />
      </div>

      {progreso && (
        <div className="superficie mt-4 rounded-lg border borde-tema p-4">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span>Progreso hacia {progreso.siguiente}</span>
            <span className="texto-suave cifras text-xs">
              faltan {progreso.faltan} momento{progreso.faltan === 1 ? '' : 's'}
            </span>
          </div>
          <Barra porcentaje={Math.round((metricas.escaneos / (metricas.escaneos + progreso.faltan)) * 100)} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* --- Mapa de paladar --- */}
        <Tarjeta titulo="Mapa de paladar">
          {paladar.every((l) => l.veces === 0) ? (
            <Vacio>Aún no hay suficientes momentos para perfilar su paladar.</Vacio>
          ) : (
            <ul className="space-y-3">
              {paladar.map((l) => (
                <li key={l.codigo}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>{l.etiqueta}</span>
                    <span className="cifras texto-suave">
                      {l.veces} · {l.porcentaje}%
                    </span>
                  </div>
                  <Barra porcentaje={l.porcentaje} tono={l.veces === 0 ? 'neutro' : 'marca'} />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* --- Hábito horario --- */}
        <Tarjeta titulo="Cuándo consume">
          {totalPorHora === 0 ? (
            <Vacio>Sin momentos registrados todavía.</Vacio>
          ) : (
            <ul className="space-y-3">
              {FRANJAS.map((f) => {
                let total = 0;
                for (const [hora, n] of Object.entries(porHora)) {
                  const h = Number(hora);
                  if (h >= f.desde && h <= f.hasta) total += n;
                }
                const pct = Math.round((total / totalPorHora) * 100);
                return (
                  <li key={f.etiqueta}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{f.etiqueta}</span>
                      <span className="cifras texto-suave">{total} · {pct}%</span>
                    </div>
                    <Barra porcentaje={pct} tono="info" />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* --- Insignias --- */}
      <div className="mt-6">
        <Tarjeta titulo={`Insignias (${insigniasObtenidas.length} de ${catalogo.length})`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogo.map((b) => {
              const tiene = obtenidas.has(b.codigo);
              const cuando = insigniasObtenidas.find((i) => i.codigo === b.codigo)?.desbloqueadaEn;
              return (
                <div
                  key={b.codigo}
                  className={`rounded-lg border p-3 ${
                    tiene
                      ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/30'
                      : 'borde-tema opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        tiene ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {b.icono}
                    </span>
                    <span className="text-sm font-medium">{b.nombre}</span>
                  </div>
                  <p className="texto-suave mt-1.5 text-xs">{b.descripcion}</p>
                  <p className="texto-suave mt-1 text-xs">
                    {tiene ? `Desbloqueada ${desde(cuando ?? null)}` : `+${b.puntosOtorgados} puntos`}
                  </p>
                </div>
              );
            })}
          </div>
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* --- Historial sensorial --- */}
        <Tarjeta titulo="Historial sensorial">
          {historial.length === 0 ? (
            <Vacio>Sin momentos registrados.</Vacio>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto borde-tema">
              {historial.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{etiquetaLinea(h.linea)}</p>
                    <p className="texto-suave truncate text-xs">
                      {h.bar ?? 'Bar desconocido'}
                      {h.zona ? ` · ${h.zona}` : ''}
                    </p>
                  </div>
                  <span className="texto-suave shrink-0 text-xs">{fecha(h.fecha)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* --- Billetera --- */}
        <Tarjeta titulo="Movimientos de puntos">
          {movimientos.length === 0 ? (
            <Vacio>Sin movimientos. Los puntos se otorgan al escanear y al desbloquear insignias.</Vacio>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto borde-tema">
              {movimientos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{m.descripcion ?? m.motivo}</p>
                    <p className="texto-suave text-xs capitalize">{m.motivo.replace('_', ' ')}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`cifras text-sm font-medium ${
                        m.puntos >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {m.puntos >= 0 ? '+' : ''}{numero(m.puntos)}
                    </span>
                    <p className="texto-suave text-xs">{desde(m.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* --- Reseñas --- */}
        <Tarjeta titulo="Reseñas">
          {resenas.length === 0 ? (
            <Vacio>Este comensal aún no ha dejado ninguna reseña.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {resenas.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{etiquetaLinea(r.linea)}</span>
                    <div className="flex items-center gap-2">
                      {r.puntuacion && <span className="cifras text-sm">{r.puntuacion}/5</span>}
                      {r.sentimiento && (
                        <Etiqueta
                          tono={r.sentimiento === 'positivo' ? 'exito' : r.sentimiento === 'negativo' ? 'riesgo' : 'neutro'}
                        >
                          {r.sentimiento}
                        </Etiqueta>
                      )}
                      {r.alertaCalidad && <Etiqueta tono="riesgo">calidad</Etiqueta>}
                    </div>
                  </div>
                  {r.comentario && <p className="texto-suave mt-1 text-xs">{r.comentario}</p>}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* --- Permisos --- */}
        <Tarjeta titulo="Consentimientos">
          {consentimientos.length === 0 ? (
            <Vacio>
              Sin consentimientos registrados. Sin ellos no se le puede enviar comunicación
              comercial.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {consentimientos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{c.consentType}</p>
                    {/*
                      IP y user-agent se guardan porque son la prueba del
                      consentimiento: sin ellos no se puede demostrar cuándo y
                      desde dónde se otorgó.
                    */}
                    <p className="texto-suave cifras truncate text-xs">{c.ipAddress ?? 'IP no registrada'}</p>
                  </div>
                  <span className="texto-suave shrink-0 text-xs">{fecha(c.grantedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
