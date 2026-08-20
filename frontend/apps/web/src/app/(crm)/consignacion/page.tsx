import Link from 'next/link';
import { entregasRecientes } from '@/lib/consultas';
import {
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  fecha,
  moneda,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Consignación · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const ESTADOS: Record<string, { texto: string; tono: 'exito' | 'aviso' | 'riesgo' | 'info' }> = {
  pending: { texto: 'Pendiente', tono: 'aviso' },
  reconciled: { texto: 'Conciliado', tono: 'info' },
  invoiced: { texto: 'Facturado', tono: 'exito' },
  cancelled: { texto: 'Cancelado', tono: 'riesgo' },
};

export default async function PaginaConsignacion() {
  const entregas = await entregasRecientes(100);

  const totales = entregas.reduce(
    (acc, e) => {
      const entregadas = e.entregadas ?? 0;
      const vendidas = e.vendidas ?? 0;
      acc.entregadas += entregadas;
      acc.vendidas += vendidas;
      // El valor vendido usa el precio de SU entrega, no un precio medio: cada
      // despacho puede llevar un precio unitario distinto.
      acc.valor += vendidas * Number(e.precioUnitario ?? 0);
      if (e.estado === 'pending') acc.pendientes += vendidas;
      return acc;
    },
    { entregadas: 0, vendidas: 0, valor: 0, pendientes: 0 }
  );

  const rotacion = totales.entregadas === 0 ? 0 : Math.round((totales.vendidas / totales.entregadas) * 100);

  return (
    <>
      <Titulo
        accion={<span className="texto-suave text-sm">Últimas {entregas.length} entregas</span>}
      >
        Consignación
      </Titulo>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Unidades entregadas" valor={numero(totales.entregadas)} />
        <Metrica etiqueta="Unidades vendidas" valor={numero(totales.vendidas)} detalle={`rotación del ${rotacion}%`} tono={rotacion >= 60 ? 'exito' : rotacion >= 30 ? 'aviso' : 'riesgo'} />
        <Metrica etiqueta="En poder del cliente" valor={numero(totales.entregadas - totales.vendidas)} />
        <Metrica etiqueta="Valor vendido" valor={moneda(totales.valor)} detalle={`${numero(totales.pendientes)} unidades sin liquidar`} tono="marca" />
      </div>

      <Tarjeta className="mt-6 overflow-hidden !p-0">
        {entregas.length === 0 ? (
          <div className="p-5"><Vacio>No hay entregas registradas todavía.</Vacio></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Despacho</th>
                  <th className="px-4 py-3 text-right font-medium">Entregadas</th>
                  <th className="px-4 py-3 text-right font-medium">Vendidas</th>
                  <th className="px-4 py-3 text-right font-medium">En poder</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {entregas.map((e) => {
                  const enPoder = (e.entregadas ?? 0) - (e.vendidas ?? 0);
                  const estado = ESTADOS[e.estado ?? ''] ?? { texto: e.estado ?? '—', tono: 'info' as const };
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <Link href={`/clientes/${e.cuentaId}`} className="font-medium hover:underline">
                          {e.cuenta}
                        </Link>
                        <p className="texto-suave text-xs">{e.zona}</p>
                      </td>
                      <td className="texto-suave px-4 py-3">{fecha(e.despachado)}</td>
                      <td className="cifras px-4 py-3 text-right">{numero(e.entregadas)}</td>
                      <td className="cifras px-4 py-3 text-right">{numero(e.vendidas)}</td>
                      <td className="cifras px-4 py-3 text-right">{numero(enPoder)}</td>
                      <td className="cifras px-4 py-3 text-right">{moneda(e.precioUnitario)}</td>
                      <td className="px-4 py-3"><Etiqueta tono={estado.tono}>{estado.texto}</Etiqueta></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
