/**
 * ============================================================================
 * Pedidos — la cola de la cocina
 * ============================================================================
 *
 * El panel de administración de la tienda vive aquí y no en una aplicación
 * aparte: el CRM ya tiene sesión, roles y auditoría. Montar un segundo panel
 * significaría duplicar los tres, y tener dos sitios donde revocar el acceso de
 * alguien que se va.
 *
 * Los pedidos vivos van ordenados por ANTIGÜEDAD, no por lo más reciente. El
 * que lleva más tiempo esperando va arriba, porque es el que más urge; ordenar
 * al revés entierra justo lo que hay que atender.
 *
 * Sin caché: es una pantalla de operación en tiempo real. Una comanda de hace
 * treinta segundos ya está desactualizada.
 */

import { colaDePedidos, resumenDelDia } from '@/lib/cocina';
import { puede, rolActual } from '@/lib/permisos';
import Comanda, { type PedidoComanda } from './Comanda';
import { Metrica, Tarjeta, Titulo, Vacio, numero } from '@/components/ui';

export const metadata = { title: 'Pedidos · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

function precio(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

export default async function PaginaPedidos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const verCerrados = p.historial === '1';

  const [cola, resumen, rol] = await Promise.all([
    colaDePedidos(verCerrados),
    resumenDelDia(),
    rolActual(),
  ]);

  const puedeAvanzar = puede(rol, 'pedidos.avanzar');

  // Los minutos vienen ya calculados por Postgres: ver colaDePedidos(). Hacerlo
  // aquí con Date.now() sería una llamada impura durante el render y, además,
  // compararía el reloj del servidor con el de la base.
  const comandas: PedidoComanda[] = cola.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    estado: c.estado,
    estadoPago: c.estadoPago,
    metodoPago: c.metodoPago,
    tipoEntrega: c.tipoEntrega,
    nombre: c.nombre,
    telefono: c.telefono,
    direccion: c.direccion,
    indicaciones: c.indicaciones,
    totalCOP: c.totalCOP,
    notas: c.notas,
    minutosInicial: c.minutos,
    items: c.items.map((i) => ({
      nombreProducto: i.nombreProducto,
      cantidad: i.cantidad,
      opciones: i.opciones,
      notas: i.notas,
    })),
  }));

  return (
    <>
      <Titulo>Pedidos</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Lo que entra por la tienda. El más antiguo va primero.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica etiqueta="Pedidos hoy" valor={numero(resumen.pedidos)} />
        <Metrica etiqueta="Ventas hoy" valor={precio(resumen.ventas)} />
        <Metrica
          etiqueta="Ticket medio"
          valor={precio(resumen.ticketMedio)}
          detalle={`${resumen.entregados} entregados`}
        />
        <Metrica
          etiqueta="Sin cobrar"
          valor={precio(resumen.sinCobrar)}
          tono={resumen.sinCobrar > 0 ? 'aviso' : 'neutro'}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          {verCerrados ? 'Historial' : `En cola (${comandas.length})`}
        </h2>
        <a
          href={verCerrados ? '/pedidos' : '/pedidos?historial=1'}
          className="texto-suave text-xs hover:underline"
        >
          {verCerrados ? 'Ver la cola' : 'Ver historial'}
        </a>
      </div>

      {comandas.length === 0 ? (
        <Tarjeta className="mt-3">
          <Vacio>
            {verCerrados
              ? 'Todavía no hay pedidos cerrados.'
              : 'No hay pedidos en cola. Los que entren por la tienda aparecen aquí solos.'}
          </Vacio>
        </Tarjeta>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {comandas.map((c) => (
            <Comanda key={c.id} pedido={c} puedeAvanzar={puedeAvanzar} />
          ))}
        </div>
      )}
    </>
  );
}
