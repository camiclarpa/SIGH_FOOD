import Link from 'next/link';
import { resumenPanel } from '@/lib/consultas';
import {
  Barra,
  EtiquetaEtapa,
  EtiquetaRiesgo,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  AvisoDegradado,
  desde,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Panel · SIGH_FOOD' };

// Los datos cambian con cada venta: sin esto Next serviría el panel cacheado
// del build y las cifras se quedarían congeladas.
export const dynamic = 'force-dynamic';

export default async function PaginaPanel() {
  const { datos: d, degradado, edadSegundos } = await resumenPanel();

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Panel</Titulo>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Clientes" valor={numero(d.cuentas)} detalle={`${d.activas} en consignación activa`} />
        <Metrica etiqueta="Comensales" valor={numero(d.comensales)} detalle="registrados vía QR" />
        <Metrica etiqueta="Escaneos" valor={numero(d.escaneos)} detalle="momentos sensoriales" />
        <Metrica
          etiqueta="Rotación"
          valor={`${d.consignacion.rotacion}%`}
          detalle={`${numero(d.consignacion.vendidas)} vendidas de ${numero(d.consignacion.entregadas)}`}
          tono={d.consignacion.rotacion >= 60 ? 'exito' : d.consignacion.rotacion >= 30 ? 'aviso' : 'riesgo'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-4 font-semibold">Embudo comercial</h2>
          {d.porEtapa.length === 0 ? (
            <Vacio>Todavía no hay clientes registrados.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porEtapa.map((e) => {
                const pct = d.cuentas === 0 ? 0 : (e.total / d.cuentas) * 100;
                return (
                  <li key={e.etapa ?? 'sin'}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <EtiquetaEtapa etapa={e.etapa} />
                      <span className="cifras text-sm font-medium">{numero(e.total)}</span>
                    </div>
                    <Barra porcentaje={pct} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-4 font-semibold">Riesgo de abandono</h2>
          {d.porRiesgo.length === 0 ? (
            <Vacio>Sin datos de riesgo. Ejecuta la predicción de churn.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.porRiesgo.map((r) => {
                const pct = d.cuentas === 0 ? 0 : (r.total / d.cuentas) * 100;
                const tono = r.riesgo === 'critical' || r.riesgo === 'high' ? 'riesgo' : r.riesgo === 'medium' ? 'aviso' : 'exito';
                return (
                  <li key={r.riesgo ?? 'sin'}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <EtiquetaRiesgo riesgo={r.riesgo} />
                      <span className="cifras text-sm font-medium">{numero(r.total)}</span>
                    </div>
                    <Barra porcentaje={pct} tono={tono} />
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-1 font-semibold">Atención prioritaria</h2>
          <p className="texto-suave mb-4 text-sm">Clientes con riesgo alto o crítico de abandono.</p>
          {d.enRiesgo.length === 0 ? (
            <Vacio>Ningún cliente en riesgo alto.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.enRiesgo.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/clientes/${c.id}`} className="block truncate font-medium hover:underline">
                      {c.nombre}
                    </Link>
                    <p className="texto-suave text-xs">
                      {c.zona} · última actividad {desde(c.ultimaActividad)}
                    </p>
                  </div>
                  <EtiquetaRiesgo riesgo={c.riesgoChurn} />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-1 font-semibold">Reposición pendiente</h2>
          <p className="texto-suave mb-4 text-sm">Stock por debajo del umbral de cada local.</p>
          {d.stockBajo.length === 0 ? (
            <Vacio>Ningún cliente por debajo de su umbral.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.stockBajo.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/clientes/${c.id}`} className="block truncate font-medium hover:underline">
                      {c.nombre}
                    </Link>
                    <p className="texto-suave text-xs">{c.zona}</p>
                  </div>
                  <span className="cifras shrink-0 text-sm">
                    <strong className="text-red-600 dark:text-red-400">{numero(c.stock)}</strong>
                    <span className="texto-suave"> / {numero(c.umbral)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
