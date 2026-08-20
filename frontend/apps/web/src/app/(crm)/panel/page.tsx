import Link from 'next/link';
import { resumenPanelB2C } from '@/lib/consultas-b2c';
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

export default async function PaginaPanel() {
  const { datos: d, degradado, edadSegundos } = await resumenPanelB2C();

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Panel</Titulo>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
