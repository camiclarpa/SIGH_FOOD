import { redirect } from 'next/navigation';
import { actorActual, puede } from '@/lib/permisos';
import {
  listarInsumos,
  listarProductosActivos,
  listarProveedores,
  margenActualDeProducto,
  recetaDeProducto,
} from '@/lib/consultas-inventario';
import { AvisoDegradado, Etiqueta, Tarjeta, Titulo, Vacio, numero } from '@/components/ui';
import { EditorInsumo } from './EditorInsumo';
import { EditorReceta } from './EditorReceta';
import { RegistrarCompra } from './RegistrarCompra';

export const metadata = { title: 'Inventario · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

export default async function PaginaInventario() {
  const actor = await actorActual();
  if (!actor || !puede(actor.rol, 'inventario.ver')) {
    redirect('/panel');
  }

  const [
    { datos: insumos, degradado, edadSegundos },
    { datos: proveedores },
    { datos: productos },
  ] = await Promise.all([listarInsumos(), listarProveedores(), listarProductosActivos()]);

  // Catálogo de un negocio de comida rápida: pocos productos, así que traer
  // la ficha técnica y el margen de cada uno en paralelo no pesa. La misma
  // consideración que ya hace el resto del CRM (ver resumenPanelB2C) — cuando
  // el volumen deje de ser pequeño, esto es lo primero que habría que revisar.
  const [recetas, margenes] = await Promise.all([
    Promise.all(productos.map((p) => recetaDeProducto(p.id))),
    Promise.all(productos.map((p) => margenActualDeProducto(p.id))),
  ]);

  const recetasPorProducto: Record<string, typeof recetas[number]['datos']> = {};
  productos.forEach((p, i) => { recetasPorProducto[p.id] = recetas[i].datos; });

  const productosConMargen = productos.map((p, i) => {
    const m = margenes[i].datos;
    return {
      ...p,
      costoRecetaCOP: m?.costoRecetaCOP ?? null,
      margenCOP: m?.margenCOP ?? null,
      completo: m?.completo ?? false,
    };
  });

  const puedeGestionar = puede(actor.rol, 'inventario.gestionar');

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Inventario</Titulo>

      <Tarjeta titulo="Insumos" accion={puedeGestionar && <EditorInsumo />}>
        {insumos.length === 0 ? (
          <Vacio>No hay insumos registrados. Crea el primero para empezar a costear recetas.</Vacio>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Insumo</th>
                  <th className="pb-2 pr-3 text-right font-medium">Stock</th>
                  <th className="pb-2 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y borde-tema">
                {insumos.map((i) => {
                  const stock = Number(i.stockTotal);
                  const bajo = i.stockMinimo != null && stock < Number(i.stockMinimo);
                  return (
                    <tr key={i.id} className={i.activo ? '' : 'opacity-50'}>
                      <td className="py-2 pr-3">{i.nombre}</td>
                      <td className="cifras py-2 pr-3 text-right">{numero(stock)} {i.unidadMedida}</td>
                      <td className="py-2 text-right">
                        {bajo ? (
                          <Etiqueta tono="riesgo">stock bajo</Etiqueta>
                        ) : !i.activo ? (
                          <Etiqueta tono="neutro">inactivo</Etiqueta>
                        ) : (
                          <Etiqueta tono="exito">ok</Etiqueta>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {puedeGestionar && (
        <div className="mt-6">
          <Tarjeta titulo="Compras de insumos">
            {insumos.length === 0 ? (
              <Vacio>Crea al menos un insumo antes de registrar una compra.</Vacio>
            ) : (
              <RegistrarCompra insumos={insumos} proveedores={proveedores} />
            )}
          </Tarjeta>
        </div>
      )}

      {puedeGestionar && (
        <div className="mt-6">
          <Tarjeta titulo="Fichas técnicas">
            {insumos.length === 0 ? (
              <Vacio>Crea al menos un insumo antes de definir una ficha técnica.</Vacio>
            ) : (
              <EditorReceta productos={productosConMargen} insumos={insumos} recetasPorProducto={recetasPorProducto} />
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
