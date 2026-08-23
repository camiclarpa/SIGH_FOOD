import Link from 'next/link';
import { resumenPanelB2C } from '@/lib/consultas-b2c';
import { resumenVentas } from '@/lib/cocina';
import { etiquetaLinea, etiquetaNivel } from '@/lib/fidelizacion';
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

export const metadata = { title: 'Panel · SIGH_FOOD' };

// Las cifras cambian con cada escaneo: sin esto Next serviría el panel cacheado
// del build y se quedarían congeladas.
export const dynamic = 'force-dynamic';

/** Pesos colombianos, sin decimales: en la calle nadie dice "treinta y dos mil con cero". */
function pesos(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

export default async function PaginaPanel() {
  // En paralelo: son dos lecturas independientes y encadenarlas duplicaría la
  // espera de la conexión a la base, que es lo que más tarda.
  const [{ datos: d, degradado, edadSegundos }, v] = await Promise.all([
    resumenPanelB2C(),
    resumenVentas(),
  ]);

  const maxSerie = Math.max(...v.serie.map((s) => s.ventas), 1);

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Panel</Titulo>

      {/*
        El dinero va PRIMERO. El panel medía escaneos, insignias y reseñas, todo
        útil, pero ninguna cifra respondía "¿cuánto vendí hoy?" — que es la
        pregunta con la que se abre el CRM por la mañana.
      */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Ventas de hoy"
          valor={pesos(v.hoy.ventas)}
          detalle={
            v.variacion === null
              ? 'ayer no hubo ventas que comparar'
              : `${v.variacion >= 0 ? '+' : ''}${v.variacion}% frente a ayer (${pesos(v.ayer.ventas)})`
          }
          tono={v.variacion === null ? 'marca' : v.variacion >= 0 ? 'exito' : 'aviso'}
        />
        <Metrica
          etiqueta="Pedidos de hoy"
          valor={numero(v.hoy.pedidos)}
          detalle={v.hoy.cancelados > 0 ? `${numero(v.hoy.cancelados)} cancelados aparte` : 'ninguno cancelado'}
          tono={v.hoy.cancelados > 0 ? 'aviso' : 'neutro'}
        />
        <Metrica
          etiqueta="Ticket promedio"
          valor={v.hoy.ticketMedio > 0 ? pesos(v.hoy.ticketMedio) : '—'}
          detalle="por pedido de hoy"
        />
        {/*
          La fila más urgente del panel: dinero ya cobrado que nadie ha empezado
          a preparar. Si esto no es cero con el local abierto, hay alguien
          esperando comida que ya pagó.
        */}
        <Metrica
          etiqueta="Por entregar"
          valor={numero(v.pendiente.pedidos)}
          detalle={
            v.cobradoSinAtender > 0
              ? `${numero(v.cobradoSinAtender)} pagados y sin confirmar`
              : `${pesos(v.pendiente.importe)} en cola`
          }
          tono={v.cobradoSinAtender > 0 ? 'riesgo' : v.pendiente.pedidos > 0 ? 'aviso' : 'exito'}
        />
      </div>

      <div className="mt-4">
        <Tarjeta
          titulo="Últimos 7 días"
          accion={
            <Link href="/pedidos" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
              Ver la cocina
            </Link>
          }
        >
          {v.serie.every((s) => s.ventas === 0) ? (
            <Vacio>Todavía no hay ventas registradas. Aparecerán aquí en cuanto entre el primer pedido.</Vacio>
          ) : (
            <div className="flex items-end gap-2 sm:gap-3" style={{ height: '7rem' }}>
              {v.serie.map((s) => {
                const alto = Math.round((s.ventas / maxSerie) * 100);
                const dia = new Date(`${s.dia}T12:00:00`);
                return (
                  <div key={s.dia} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="cifras texto-suave text-[10px] tabular-nums">
                      {s.ventas > 0 ? numero(Math.round(s.ventas / 1000)) + 'k' : ''}
                    </span>
                    <div
                      className="w-full rounded-t bg-orange-500/85 transition-[height]"
                      // Un mínimo visible para los días con venta pequeña: a 0 px
                      // un día flojo se confunde con un día sin abrir.
                      style={{ height: `${s.ventas > 0 ? Math.max(alto, 4) : 2}%`, minHeight: s.ventas > 0 ? '3px' : '2px' }}
                      title={`${pesos(s.ventas)} · ${s.pedidos} pedido${s.pedidos === 1 ? '' : 's'}`}
                    />
                    <span className="texto-suave text-[10px] capitalize">
                      {dia.toLocaleDateString('es-CO', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Comensales"
          valor={numero(d.comensales)}
          detalle={`${numero(d.conConsentimiento)} con consentimiento`}
        />
        <Metrica
          etiqueta="Momentos sensoriales"
          valor={numero(d.momentos)}
          detalle="escaneos de QR registrados"
        />
        {/*
          La métrica que de verdad importa: si casi nadie vuelve, el QR capta
          pero no fideliza, y el programa entero no está funcionando.
        */}
        <Metrica
          etiqueta="Recurrencia"
          valor={`${d.tasaRecurrencia}%`}
          detalle={`${numero(d.recurrentes)} volvieron a escanear`}
          tono={d.tasaRecurrencia >= 30 ? 'exito' : d.tasaRecurrencia >= 15 ? 'aviso' : 'riesgo'}
        />
        <Metrica
          etiqueta="En riesgo"
          valor={numero(d.enRiesgo)}
          detalle="más de 15 días sin actividad"
          tono={d.enRiesgo > 0 ? 'aviso' : 'neutro'}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Puntos en circulación"
          valor={numero(d.puntosEnCirculacion)}
          detalle="saldo total de la billetera"
          tono="marca"
        />
        <Metrica
          etiqueta="Insignias otorgadas"
          valor={numero(d.insigniasDadas)}
          detalle="logros desbloqueados"
        />
        <Metrica
          etiqueta="Reseñas"
          valor={numero(d.resenas.total)}
          detalle={`${numero(d.resenas.negativas)} negativas`}
          tono={d.resenas.negativas > 0 ? 'aviso' : 'neutro'}
        />
        <Metrica
          etiqueta="Alertas de calidad"
          valor={numero(d.resenas.alertas)}
          detalle="detectadas por la IA en reseñas"
          tono={d.resenas.alertas > 0 ? 'riesgo' : 'exito'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Niveles del pasaporte">
          {d.porNivel.length === 0 ? (
            <Vacio>Todavía no hay comensales registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porNivel.map((n) => {
                const pct = d.comensales === 0 ? 0 : Math.round((Number(n.total) / d.comensales) * 100);
                return (
                  <li key={n.nivel ?? 'sin-nivel'}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{etiquetaNivel(n.nivel)}</span>
                      <span className="cifras texto-suave">
                        {numero(n.total)} · {pct}%
                      </span>
                    </div>
                    <Barra porcentaje={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Paladar del conjunto">
          {d.porLinea.length === 0 ? (
            <Vacio>Aún no hay momentos sensoriales registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porLinea.map((l) => {
                const pct = d.momentos === 0 ? 0 : Math.round((Number(l.total) / d.momentos) * 100);
                return (
                  <li key={l.linea ?? 'sin-linea'}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{etiquetaLinea(l.linea)}</span>
                      <span className="cifras texto-suave">
                        {numero(l.total)} · {pct}%
                      </span>
                    </div>
                    <Barra porcentaje={pct} tono="info" />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta
          titulo="Últimos comensales"
          accion={
            <Link href="/comensales" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
              Ver todos
            </Link>
          }
        >
          {d.recientes.length === 0 ? (
            <Vacio>Nadie se ha registrado todavía. Los comensales entran al escanear un QR en la mesa.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.recientes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/comensales/${c.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {c.nombre ?? 'Sin nombre'}
                    </Link>
                    <p className="texto-suave cifras truncate text-xs">{c.whatsapp}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Etiqueta tono="info">{etiquetaNivel(c.nivel)}</Etiqueta>
                    <span className="cifras texto-suave text-xs">{numero(c.puntos ?? 0)} pts</span>
                    <span className="texto-suave hidden text-xs sm:inline">{desde(c.alta)}</span>
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
