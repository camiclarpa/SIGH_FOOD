// =============================================================================
// Programa de embajadores
// =============================================================================
//
// Lo que hace que esta pantalla signifique algo es la columna de ventas, y esa
// columna existe gracias a la captura de origen: el código del embajador viaja
// en su enlace, se guarda en `pedidos.referido_por` y aquí se cruza.
//
// Sin ese dato, un programa de embajadores es una lista de nombres y una
// sensación. Con él, es una cifra por persona que permite decidir a quién
// premiar más y a quién dejar de premiar.
//
// Las ventas NO se guardan en ninguna columna acumulada: se calculan al leer.
// Un contador se desincroniza en cuanto se cancela un pedido, y entonces hay dos
// cifras y nadie sabe cuál vale.

import Link from 'next/link';
import { listarEmbajadores, candidatosAEmbajador, resumenEmbajadores } from '@/lib/consultas-contenido';
import { puede, rolActual } from '@/lib/permisos';
import { EditorEmbajador, ESTADOS_EMBAJADOR } from './EditorEmbajador';
import { Etiqueta, Metrica, Tarjeta, Titulo, Vacio, numero } from '@/components/ui';

export const metadata = { title: 'Embajadores · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

function pesos(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

const TONO: Record<string, 'exito' | 'aviso' | 'neutro'> = {
  activo: 'exito',
  pausado: 'aviso',
  retirado: 'neutro',
};

export default async function PaginaEmbajadores() {
  const [lista, candidatos, resumen, rol] = await Promise.all([
    listarEmbajadores(),
    candidatosAEmbajador(),
    resumenEmbajadores(30),
    rolActual(),
  ]);

  const puedeGestionar = puede(rol, 'embajadores.gestionar');

  const ventasTotales = lista.reduce((s, e) => s + e.ventas, 0);
  const pedidosTotales = lista.reduce((s, e) => s + e.pedidos, 0);

  return (
    <>
      <Titulo
        accion={
          puedeGestionar ? <EditorEmbajador candidatos={candidatos} /> : undefined
        }
      >
        Embajadores
      </Titulo>
      <p className="texto-suave -mt-2 mb-4 max-w-3xl text-sm">
        Quién habla de la marca y qué trae. Cada uno tiene un enlace con su código, y todo pedido
        que entra por ahí queda contado a su nombre.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Embajadores activos"
          valor={numero(resumen.activos)}
          detalle={`${numero(lista.length)} en total`}
          tono={resumen.activos > 0 ? 'marca' : 'neutro'}
        />
        <Metrica
          etiqueta="Pedidos que han traído"
          valor={numero(pedidosTotales)}
          detalle="entregados, desde siempre"
        />
        <Metrica
          etiqueta="Ventas atribuidas"
          valor={pesos(ventasTotales)}
          detalle="acumulado del programa"
          tono={ventasTotales > 0 ? 'exito' : 'neutro'}
        />
        <Metrica
          etiqueta={`Últimos ${resumen.dias} días`}
          valor={pesos(resumen.ventas)}
          detalle={`${numero(resumen.pedidos)} pedidos con código de referido`}
        />
      </div>

      <div className="mt-6">
        <Tarjeta titulo="Quién trae qué">
          {lista.length === 0 ? (
            <Vacio>
              Todavía no hay embajadores. El mejor primero suele ser alguien que ya te compra: sabe
              de qué habla y no suena a anuncio. Al darlo de alta se le genera un enlace propio y
              todo lo que traiga aparece aquí.
            </Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wider">
                    <th className="py-2 pr-3 font-medium">Embajador</th>
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 text-right font-medium">Personas</th>
                    <th className="py-2 pr-3 text-right font-medium">Pedidos</th>
                    <th className="py-2 pr-3 text-right font-medium">Ventas</th>
                    {puedeGestionar && <th className="py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((e) => (
                    <tr key={e.id} className="border-b borde-tema last:border-0">
                      <td className="py-2.5 pr-3">
                        <Link href={`/comensales/${e.consumerId}`} className="font-medium hover:underline">
                          {e.alias ?? e.nombre ?? 'Sin nombre'}
                        </Link>
                        <p className="texto-suave cifras text-xs">{e.telefono}</p>
                      </td>
                      <td className="cifras py-2.5 pr-3 text-xs">{e.codigo}</td>
                      <td className="py-2.5 pr-3">
                        <Etiqueta tono={TONO[e.estado] ?? 'neutro'}>
                          {ESTADOS_EMBAJADOR.find((s) => s.valor === e.estado)?.texto ?? e.estado}
                        </Etiqueta>
                      </td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(e.personas)}</td>
                      <td className="cifras py-2.5 pr-3 text-right">{numero(e.pedidos)}</td>
                      <td className="cifras py-2.5 pr-3 text-right font-medium">{pesos(e.ventas)}</td>
                      {puedeGestionar && (
                        <td className="py-2.5 text-right">
                          <EditorEmbajador
                            embajador={{
                              id: e.id,
                              consumerId: e.consumerId,
                              alias: e.alias,
                              codigo: e.codigo,
                              estado: e.estado,
                              puntosPorPedido: e.puntosPorPedido,
                              seguidores: e.seguidores,
                            }}
                            candidatos={[]}
                            nombreActual={e.alias ?? e.nombre}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      {!puedeGestionar && (
        <p className="texto-suave mt-4 text-sm">
          Tu rol permite ver el programa pero no dar de alta embajadores. Dar de alta a uno fija una
          recompensa que se paga en cada pedido que traiga, así que esa decisión la toma un
          administrador.
        </p>
      )}
    </>
  );
}
