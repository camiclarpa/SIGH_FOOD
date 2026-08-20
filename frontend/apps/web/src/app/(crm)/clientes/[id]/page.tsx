import Link from 'next/link';
import { notFound } from 'next/navigation';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  accounts,
  consignationLogs,
  qrCodes,
  sensoryMoments,
  multivariatePredictions,
} from '@sighfood/domain/db/schema';
import { count, desc, eq, sql } from 'drizzle-orm';
import {
  Barra,
  Etiqueta,
  EtiquetaEtapa,
  EtiquetaRiesgo,
  Metrica,
  NIVELES_LEAD,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  fecha,
  moneda,
  numero,
  porcentaje,
} from '@/components/ui';

export const dynamic = 'force-dynamic';

const LINEAS: Record<string, string> = {
  flavor_switch: 'Flavor Switch',
  taste_shock: 'Taste Shock',
  spicy_volcano: 'Spicy Volcano',
  umami_boost: 'Umami Boost',
  sweet_craft: 'Sweet Craft',
};

async function cargar(id: string) {
  return conBaseDeDatos(async (db) => {
    const [cuenta] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!cuenta) return null;

    // En paralelo: son independientes y en serie sumarían sus latencias.
    const [entregas, codigos, totales, escaneos, predicciones] = await Promise.all([
      db
        .select()
        .from(consignationLogs)
        .where(eq(consignationLogs.accountId, id))
        .orderBy(desc(consignationLogs.dispatchedAt))
        .limit(15),

      db.select().from(qrCodes).where(eq(qrCodes.accountId, id)).orderBy(qrCodes.tableNumber),

      // Los totales se agregan en SQL: sumar en JavaScript las 15 entregas de
      // arriba daría un total corto, porque esa lista está recortada.
      db
        .select({
          entregadas: sql<string>`coalesce(sum(${consignationLogs.unitsDelivered}), 0)`,
          vendidas: sql<string>`coalesce(sum(${consignationLogs.unitsSold}), 0)`,
          pendientes: sql<string>`coalesce(sum(case when ${consignationLogs.settlementStatus} = 'pending' then ${consignationLogs.unitsSold} else 0 end), 0)`,
        })
        .from(consignationLogs)
        .where(eq(consignationLogs.accountId, id)),

      db
        .select({ linea: sensoryMoments.productLine, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .where(eq(sensoryMoments.accountId, id))
        .groupBy(sensoryMoments.productLine),

      db
        .select()
        .from(multivariatePredictions)
        .where(eq(multivariatePredictions.targetEntityId, id))
        .orderBy(desc(multivariatePredictions.verifiedAt))
        .limit(6),
    ]);

    const entregadas = Number(totales[0]?.entregadas ?? 0);
    const vendidas = Number(totales[0]?.vendidas ?? 0);

    return {
      cuenta,
      entregas,
      codigos,
      escaneos,
      predicciones,
      resumen: {
        entregadas,
        vendidas,
        enPoder: entregadas - vendidas,
        pendientes: Number(totales[0]?.pendientes ?? 0),
        rotacion: entregadas === 0 ? 0 : Math.round((vendidas / entregadas) * 100),
      },
    };
  });
}

/** El título de la pestaña lleva el nombre del cliente: con varias fichas
 *  abiertas, "SIGH_FOOD" repetido no permite distinguirlas. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nombre = await conBaseDeDatos(async (db) => {
    const [fila] = await db
      .select({ nombre: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1);
    return fila?.nombre;
  });
  return { title: nombre ? `${nombre} · SIGH_FOOD` : 'Cliente · SIGH_FOOD' };
}

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await cargar(id);
  if (!d) notFound();

  const { cuenta, resumen } = d;
  const nivel = NIVELES_LEAD[cuenta.leadScore ?? ''] ?? { texto: '—', tono: 'neutro' as const };
  const totalEscaneos = d.escaneos.reduce((s, e) => s + e.total, 0);

  return (
    <>
      <Link href="/clientes" className="texto-suave mb-3 inline-block text-sm hover:underline">
        ← Clientes
      </Link>

      <Titulo
        accion={
          <div className="flex flex-wrap items-center gap-2">
            <EtiquetaEtapa etapa={cuenta.pipelineStage} />
            <EtiquetaRiesgo riesgo={cuenta.churnRisk} />
            <Etiqueta tono={nivel.tono}>Lead {nivel.texto}</Etiqueta>
          </div>
        }
      >
        {cuenta.name}
      </Titulo>

      <div className="grid gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-1">
          <h2 className="mb-3 font-semibold">Datos de contacto</h2>
          <dl className="space-y-2 text-sm">
            {[
              ['Nombre comercial', cuenta.commercialName || '—'],
              ['Zona', cuenta.zone],
              ['Dirección', cuenta.address],
              ['Responsable', cuenta.decisionMakerName],
              ['Cargo', cuenta.decisionMakerRole || '—'],
              ['Teléfono', cuenta.phone],
              ['Email', cuenta.email],
              ['Alta', fecha(cuenta.createdAt)],
              ['Última actividad', desde(cuenta.lastActivity)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="texto-suave shrink-0">{k}</dt>
                <dd className="truncate text-right font-medium" title={String(v)}>{v}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Metrica
            etiqueta="Stock en el local"
            valor={numero(cuenta.currentConsignationStock)}
            detalle={`umbral de reposición: ${numero(cuenta.reorderAlertThreshold)}`}
            tono={(cuenta.currentConsignationStock ?? 0) <= (cuenta.reorderAlertThreshold ?? 0) ? 'riesgo' : 'exito'}
          />
          <Metrica
            etiqueta="Rotación"
            valor={`${resumen.rotacion}%`}
            detalle={`${numero(resumen.vendidas)} de ${numero(resumen.entregadas)} unidades`}
            tono={resumen.rotacion >= 60 ? 'exito' : resumen.rotacion >= 30 ? 'aviso' : 'riesgo'}
          />
          <Metrica etiqueta="Escaneos QR" valor={numero(totalEscaneos)} detalle={`${d.codigos.length} mesas con código`} />
          <Metrica
            etiqueta="Pendiente de liquidar"
            valor={numero(resumen.pendientes)}
            detalle="unidades vendidas sin liquidar"
            tono={resumen.pendientes > 0 ? 'aviso' : 'neutro'}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-4 font-semibold">Señales de la IA</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="texto-suave">Probabilidad de abandono</dt>
              <dd className="cifras font-medium">{porcentaje(cuenta.churnScore)}</dd>
            </div>
            <Barra
              porcentaje={Number(cuenta.churnScore ?? 0) * 100}
              tono={Number(cuenta.churnScore ?? 0) > 0.6 ? 'riesgo' : Number(cuenta.churnScore ?? 0) > 0.3 ? 'aviso' : 'exito'}
            />
            <div className="flex items-center justify-between gap-3 pt-2">
              <dt className="texto-suave">Probabilidad de conversión</dt>
              <dd className="cifras font-medium">{porcentaje(cuenta.conversionProb)}</dd>
            </div>
            <Barra porcentaje={Number(cuenta.conversionProb ?? 0) * 100} tono="info" />
            <div className="flex items-center justify-between gap-3 pt-2">
              <dt className="texto-suave">Compromiso</dt>
              <dd className="cifras font-medium">{porcentaje(cuenta.engagementScore)}</dd>
            </div>
            <Barra porcentaje={Number(cuenta.engagementScore ?? 0) * 100} tono="marca" />
          </dl>

          {d.predicciones.length > 0 && (
            <ul className="mt-4 space-y-2 border-t borde-tema pt-4 text-sm">
              {d.predicciones.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="texto-suave truncate">{p.predictionType} · {p.horizon}</span>
                  <span className="cifras shrink-0 font-medium">{numero(p.predictedValue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-4 font-semibold">Escaneos por línea</h2>
          {d.escaneos.length === 0 ? (
            <Vacio>Este cliente todavía no tiene escaneos.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.escaneos.map((e) => (
                <li key={e.linea}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span>{LINEAS[e.linea] ?? e.linea}</span>
                    <span className="cifras font-medium">{numero(e.total)}</span>
                  </div>
                  <Barra porcentaje={totalEscaneos === 0 ? 0 : (e.total / totalEscaneos) * 100} />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4 overflow-hidden !p-0">
        <h2 className="border-b borde-tema px-5 py-4 font-semibold">Historial de consignación</h2>
        {d.entregas.length === 0 ? (
          <div className="p-5"><Vacio>Sin entregas registradas.</Vacio></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 font-medium">Despacho</th>
                  <th className="px-5 py-3 text-right font-medium">Entregadas</th>
                  <th className="px-5 py-3 text-right font-medium">Vendidas</th>
                  <th className="px-5 py-3 text-right font-medium">Precio</th>
                  <th className="px-5 py-3 font-medium">Lote</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {d.entregas.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-3">{fecha(e.dispatchedAt)}</td>
                    <td className="cifras px-5 py-3 text-right">{numero(e.unitsDelivered)}</td>
                    <td className="cifras px-5 py-3 text-right">{numero(e.unitsSold)}</td>
                    <td className="cifras px-5 py-3 text-right">{moneda(e.unitPrice)}</td>
                    <td className="texto-suave px-5 py-3">{e.batchNumber || '—'}</td>
                    <td className="px-5 py-3">
                      <Etiqueta tono={e.settlementStatus === 'reconciled' || e.settlementStatus === 'invoiced' ? 'exito' : e.settlementStatus === 'cancelled' ? 'riesgo' : 'aviso'}>
                        {e.settlementStatus}
                      </Etiqueta>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="mt-4">
        <h2 className="mb-4 font-semibold">Códigos QR ({d.codigos.length})</h2>
        {d.codigos.length === 0 ? (
          <Vacio>Este cliente no tiene códigos QR generados.</Vacio>
        ) : (
          <div className="flex flex-wrap gap-2">
            {d.codigos.map((q) => (
              <span key={q.id} className="superficie rounded-lg border px-3 py-1.5 text-sm">
                Mesa {q.tableNumber}{' '}
                <Etiqueta tono={q.isActive ? 'exito' : 'neutro'}>{q.isActive ? 'activo' : 'inactivo'}</Etiqueta>
              </span>
            ))}
          </div>
        )}
      </Tarjeta>
    </>
  );
}
