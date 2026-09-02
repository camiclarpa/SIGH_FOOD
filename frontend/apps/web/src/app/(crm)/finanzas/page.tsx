import { redirect } from 'next/navigation';
import Link from 'next/link';
import { actorActual, puede } from '@/lib/permisos';
import { resumenFinanciero } from '@/lib/consultas-finanzas';
import { historialCaja } from '@/lib/consultas-caja';
import { faltantesRecientes } from '@/lib/consultas-inventario';
import {
  AvisoDegradado,
  Barra,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  moneda,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Finanzas · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaFinanzas() {
  const actor = await actorActual();

  // Igual que /usuarios: se comprueba aquí y no solo en el menú. Márgenes y
  // costos son el dato más sensible del negocio.
  if (!actor || !puede(actor.rol, 'finanzas.ver')) {
    redirect('/panel');
  }

  const [{ datos: r, degradado, edadSegundos }, { datos: historial }, { datos: faltantes }] = await Promise.all([
    resumenFinanciero(),
    historialCaja(5),
    faltantesRecientes(10),
  ]);

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Finanzas</Titulo>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Ventas de hoy"
          valor={moneda(r.hoy.netoCOP)}
          detalle={`${moneda(r.hoy.efectivoCOP)} efectivo · ${moneda(r.hoy.digitalCOP)} digital`}
        />
        <Metrica
          etiqueta="Margen bruto del mes"
          valor={r.mes.margenBrutoPorcentaje != null ? `${r.mes.margenBrutoPorcentaje}%` : '—'}
          detalle={`${moneda(r.mes.margenBrutoCOP)} sobre ${moneda(r.mes.ventasCOP)} vendidos`}
          tono={
            r.mes.margenBrutoPorcentaje == null
              ? 'neutro'
              : r.mes.margenBrutoPorcentaje >= 40
              ? 'exito'
              : r.mes.margenBrutoPorcentaje >= 20
              ? 'aviso'
              : 'riesgo'
          }
        />
        <Metrica
          etiqueta="COGS del mes"
          valor={moneda(r.mes.cogsCOP)}
          detalle="costo real de insumos vendidos"
        />
        <Metrica
          etiqueta="Costo de fidelización"
          valor={moneda(r.mes.costoFidelizacionCOP)}
          detalle="puntos canjeados este mes"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Pasivo de puntos vs. ingresos">
          <p className="cifras text-3xl font-semibold">{moneda(r.pasivoPuntos.cop)}</p>
          <p className="texto-suave mt-1 text-xs">
            saldo vivo de la billetera, a $50 COP por punto
          </p>
          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span>
                {r.pasivoPuntos.porcentajeSobreVentas30dias != null
                  ? `${r.pasivoPuntos.porcentajeSobreVentas30dias}% de las ventas de 30 días`
                  : 'sin ventas en 30 días para comparar'}
              </span>
              <span className="texto-suave">umbral {r.pasivoPuntos.umbral}%</span>
            </div>
            <Barra
              porcentaje={
                r.pasivoPuntos.porcentajeSobreVentas30dias != null
                  ? (r.pasivoPuntos.porcentajeSobreVentas30dias / r.pasivoPuntos.umbral) * 100
                  : 0
              }
              tono={r.pasivoPuntos.alerta ? 'riesgo' : 'exito'}
            />
          </div>
          {r.pasivoPuntos.alerta && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              El pasivo supera el {r.pasivoPuntos.umbral}% de las ventas de 30 días. Conviene
              revisar el ritmo de emisión de puntos o de campañas.
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Proyección de flujo de caja (30 días)">
          <p className="cifras text-3xl font-semibold">{moneda(r.proyeccion30dias)}</p>
          <p className="texto-suave mt-1 text-xs">
            promedio móvil de {moneda(r.promedioDiario14dias)}/día en los últimos 14 días, × 30
          </p>
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Últimos cierres de caja"
          accion={
            <Link href="/finanzas/caja" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
              Ver caja
            </Link>
          }
        >
          {historial.length === 0 ? (
            <Vacio>Todavía no se ha cerrado ninguna caja.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {historial.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{s.abiertaPorNombre ?? '—'} → {s.cerradaPorNombre ?? '—'}</p>
                    <p className="texto-suave text-xs">{desde(s.cerradaEn)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="cifras">{moneda(s.efectivoContadoCOP)}</p>
                    <p className={`text-xs ${Number(s.diferenciaCOP) === 0 ? 'texto-suave' : Number(s.diferenciaCOP) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      diferencia {moneda(s.diferenciaCOP)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Inventario desincronizado"
          accion={
            <Link href="/finanzas/inventario" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
              Ver inventario
            </Link>
          }
        >
          {faltantes.length === 0 ? (
            <Vacio>Sin faltantes registrados. El inventario cuadra con las ventas.</Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {faltantes.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="truncate">{f.insumoNombre}</span>
                  <span className="cifras texto-suave shrink-0 text-xs">
                    {numero(f.cantidad)} {f.unidadMedida} · {desde(f.creadoEn)}
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
