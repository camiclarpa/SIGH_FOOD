import Link from 'next/link';
import { resumenPremios, cuentasActivas, STOCK_BAJO_UMBRAL } from '@/lib/consultas-b2c';
import { etiquetaNivel } from '@/lib/fidelizacion';
import { puede, rolActual } from '@/lib/permisos';
import {
  AvisoDegradado,
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  fecha,
  numero,
} from '@/components/ui';
import { Exportar } from '@/components/Exportar';
import { ConsolaRedencion } from './ConsolaRedencion';
import { EditorPremio } from './EditorPremio';

export const metadata = { title: 'Premios · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  producto: 'Producto',
  descuento: 'Descuento',
  experiencia: 'Experiencia',
  acceso_vip: 'Acceso VIP',
};

const ESTADOS: Record<string, 'exito' | 'aviso' | 'riesgo' | 'neutro'> = {
  canjeado: 'exito',
  pendiente: 'aviso',
  caducado: 'neutro',
  anulado: 'riesgo',
};

export default async function PaginaPremios() {
  const [{ datos: d, degradado, edadSegundos }, { datos: cuentas }, rol] = await Promise.all([
    resumenPremios(),
    cuentasActivas(),
    rolActual(),
  ]);

  const puedeGestionar = puede(rol, 'premios.gestionar');
  const puedeEntregar = puede(rol, 'canjes.entregar');

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo accion={<Exportar tabla="canjes" puedeExportar={puede(rol, 'datos.exportar')} />}>
        Premios y canjes
      </Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Lo que el comensal puede conseguir con sus puntos, y la consola para entregárselo
        en la mesa.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metrica etiqueta="Premios activos" valor={`${d.catalogo.filter((r) => r.activo).length} / ${d.catalogo.length}`} />
        <Metrica etiqueta="Canjes emitidos" valor={numero(d.totales.emitidos)} />
        <Metrica
          etiqueta="Sin recoger"
          valor={numero(d.totales.pendientes)}
          detalle={`${numero(d.totales.caducados)} ya caducados`}
          tono={d.totales.caducados > 0 ? 'aviso' : 'neutro'}
        />
        <Metrica
          etiqueta="Puntos gastados"
          valor={numero(d.totales.puntosGastados)}
          detalle="salieron de circulación"
          tono="marca"
        />
        <Metrica
          etiqueta="Con poco stock"
          valor={numero(d.totales.conPocoStock)}
          detalle={`${STOCK_BAJO_UMBRAL} unidades o menos`}
          tono={d.totales.conPocoStock > 0 ? 'riesgo' : 'neutro'}
        />
      </div>

      {/* La consola va arriba: es lo que se usa a diario, con el comensal delante. */}
      <div className="mt-6">
        <Tarjeta titulo="Entregar un canje">
          <ConsolaRedencion puedeEntregar={puedeEntregar} cuentas={cuentas} />
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta
          titulo="Catálogo"
          accion={puedeGestionar ? <EditorPremio /> : null}
        >
          {d.catalogo.length === 0 ? (
            <Vacio>
              No hay premios definidos. Sin ellos los puntos solo suben, y un saldo que
              nunca se gasta deja de motivar.
            </Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Premio</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 text-right font-medium">Coste</th>
                    <th className="pb-2 pr-3 text-right font-medium">Stock</th>
                    <th className="pb-2 pr-3 font-medium">Nivel mín.</th>
                    <th className="pb-2 pr-3 text-right font-medium">Emitidos</th>
                    <th className="pb-2 pr-3 text-right font-medium">Entregados</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.catalogo.map((r) => (
                    <tr key={r.id} className={r.activo ? '' : 'opacity-50'}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{r.nombre}</p>
                        {r.descripcion && <p className="texto-suave text-xs">{r.descripcion}</p>}
                      </td>
                      <td className="texto-suave py-2.5 pr-3 text-xs">{TIPOS[r.tipo] ?? r.tipo}</td>
                      <td className="cifras py-2.5 pr-3 text-right font-medium">{numero(r.costePuntos)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">
                        {r.stock === null ? (
                          <span className="texto-suave">∞</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {numero(r.stock)}
                            {r.stockBajo && <Etiqueta tono="riesgo">bajo</Etiqueta>}
                          </span>
                        )}
                      </td>
                      <td className="texto-suave py-2.5 pr-3 text-xs">
                        {r.nivelMinimo ? etiquetaNivel(r.nivelMinimo) : '—'}
                      </td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(r.metricas.emitidos)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(r.metricas.entregados)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Etiqueta tono={r.activo ? 'exito' : 'neutro'}>
                            {r.activo ? 'activo' : 'inactivo'}
                          </Etiqueta>
                          {puedeGestionar && (
                            <EditorPremio
                              premio={{
                                id: r.id,
                                nombre: r.nombre,
                                descripcion: r.descripcion ?? '',
                                tipo: r.tipo,
                                costePuntos: r.costePuntos,
                                stock: r.stock,
                                nivelMinimo: r.nivelMinimo,
                                diasValidez: r.diasValidez,
                                activo: r.activo,
                              }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta titulo="Últimos canjes">
          {d.ultimos.length === 0 ? (
            <Vacio>Nadie ha canjeado puntos todavía.</Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[54rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Código</th>
                    <th className="pb-2 pr-3 font-medium">Comensal</th>
                    <th className="pb-2 pr-3 font-medium">Premio</th>
                    <th className="pb-2 pr-3 text-right font-medium">Puntos</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 pr-3 font-medium">Caduca</th>
                    <th className="pb-2 pr-3 font-medium">Punto de venta</th>
                    <th className="pb-2 font-medium">Atendido por</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.ultimos.map((c) => {
                    const caducado = c.estado === 'pendiente' && new Date(c.expiraEn) < new Date();
                    return (
                      <tr key={c.id}>
                        <td className="cifras py-2.5 pr-3 tracking-widest">{c.codigo}</td>
                        <td className="py-2.5 pr-3">
                          {c.comensalId ? (
                            <Link href={`/comensales/${c.comensalId}`} className="hover:underline">
                              {c.comensal ?? 'Sin nombre'}
                            </Link>
                          ) : (
                            <span className="texto-suave">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">{c.premio}</td>
                        <td className="cifras py-2.5 pr-3 text-right">{numero(c.puntos)}</td>
                        <td className="py-2.5 pr-3">
                          <Etiqueta tono={caducado ? 'riesgo' : ESTADOS[c.estado] ?? 'neutro'}>
                            {caducado ? 'caducado' : c.estado}
                          </Etiqueta>
                        </td>
                        <td className="texto-suave py-2.5 pr-3 text-xs">
                          {c.estado === 'canjeado' ? `entregado ${desde(c.canjeadoEn)}` : fecha(c.expiraEn)}
                        </td>
                        <td className="texto-suave py-2.5 pr-3 text-xs">{c.puntoDeVenta ?? '—'}</td>
                        <td className="texto-suave py-2.5 text-xs">{c.atendioPor ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
