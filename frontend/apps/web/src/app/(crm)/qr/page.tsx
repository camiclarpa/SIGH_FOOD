import Link from 'next/link';
import { headers } from 'next/headers';
import { codigosQr } from '@/lib/consultas';
import { cuentasActivas } from '@/lib/consultas-b2c';
import { puede, rolActual } from '@/lib/permisos';
import { AvisoDegradado, Etiqueta, Metrica, Tarjeta, Titulo, Vacio, desde, fecha, numero } from '@/components/ui';
import { GenerarLote } from './GenerarLote';
import { RedirigirLote } from './RedirigirLote';
import { AccionesMesa } from './AccionesMesa';
import { VistaQr } from './VistaQr';

export const metadata = { title: 'Códigos QR · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaQr() {
  const [{ datos: codigos, degradado, edadSegundos }, { datos: cuentas }, rol, cabeceras] = await Promise.all([
    codigosQr(500),
    cuentasActivas(),
    rolActual(),
    headers(),
  ]);

  const puedeGestionar = puede(rol, 'qr.gestionar');
  const puedeRedirigir = puede(rol, 'qr.redirigir');

  // El origen sale de la propia petición: así el QR apunta siempre al dominio
  // real desde el que se sirve el CRM, sin hardcodear uno que puede cambiar.
  const proto = cabeceras.get('x-forwarded-proto') ?? 'https';
  const host = cabeceras.get('host') ?? '';
  const origen = `${proto}://${host}`;

  const activos = codigos.filter((c) => c.activo).length;
  const locales = new Set(codigos.map((c) => c.cuentaId)).size;
  const redirigidos = codigos.filter((c) => c.destinoUrl).length;

  const porLocal = new Map<string, typeof codigos>();
  for (const c of codigos) {
    const lista = porLocal.get(c.cuentaId) ?? [];
    lista.push(c);
    porLocal.set(c.cuentaId, lista);
  }

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={puedeGestionar ? <GenerarLote cuentas={cuentas} /> : null}>Códigos QR</Titulo>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metrica etiqueta="Códigos" valor={numero(codigos.length)} detalle={`${activos} activos`} />
        <Metrica etiqueta="Locales con QR" valor={numero(locales)} />
        <Metrica
          etiqueta="Mesas por local"
          valor={locales === 0 ? '0' : (codigos.length / locales).toFixed(1)}
          detalle="promedio"
        />
        <Metrica
          etiqueta="Redirigidos"
          valor={numero(redirigidos)}
          detalle="con campaña activa"
          tono={redirigidos > 0 ? 'info' : 'neutro'}
        />
      </div>

      {codigos.length === 0 ? (
        <div className="mt-6"><Vacio>No hay códigos QR generados.</Vacio></div>
      ) : (
        <div className="mt-6 space-y-4">
          {[...porLocal.entries()].map(([cuentaId, mesas]) => {
            const primera = mesas[0];
            return (
              <Tarjeta key={cuentaId}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/clientes/${cuentaId}`} className="font-medium hover:underline">
                      {primera.cuenta}
                    </Link>
                    <p className="texto-suave text-xs">{primera.zona}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="texto-suave cifras text-sm">
                      {numero(primera.escaneosCuenta)} escaneos · {mesas.length} mesas
                    </span>
                    {puedeGestionar && (
                      <a
                        href={`/api/qr/imprimir?account_id=${cuentaId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border borde-tema px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Imprimir material POP
                      </a>
                    )}
                    {puedeRedirigir && <RedirigirLote accountId={cuentaId} cuenta={primera.cuenta} />}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-sm">
                    <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                      <tr>
                        <th className="pb-2 pr-3 font-medium">Mesa</th>
                        <th className="pb-2 pr-3 text-right font-medium">Escaneos</th>
                        <th className="pb-2 pr-3 font-medium">Último</th>
                        <th className="pb-2 pr-3 font-medium">Destino</th>
                        <th className="pb-2 pr-3 font-medium">Estado</th>
                        <th className="pb-2 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y borde-tema">
                      {mesas.map((m) => (
                        <tr key={m.id}>
                          <td className="py-2 pr-3 font-medium">{m.mesa}</td>
                          <td className="cifras py-2 pr-3 text-right">{numero(m.escaneosMesa)}</td>
                          <td className="texto-suave py-2 pr-3 text-xs">
                            {m.ultimoEscaneoMesa ? desde(new Date(m.ultimoEscaneoMesa)) : '—'}
                          </td>
                          <td className="texto-suave py-2 pr-3 text-xs">
                            {m.destinoUrl ? (
                              <span title={m.destinoUrl}>{m.campana || 'redirigido'}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Etiqueta tono={m.activo ? 'exito' : 'neutro'}>
                              {m.activo ? 'activo' : 'inactivo'}
                            </Etiqueta>
                          </td>
                          <td className="py-2 text-xs">
                            <VistaQr url={`${origen}/m/${m.token}`} etiqueta={`${primera.cuenta} · ${m.mesa}`} subtitulo={fecha(m.creado)} />
                            {puedeRedirigir && (
                              <>
                                {' · '}
                                <AccionesMesa id={m.id} mesa={m.mesa} activo={m.activo ?? false} destinoUrl={m.destinoUrl} campana={m.campana} />
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </>
  );
}
