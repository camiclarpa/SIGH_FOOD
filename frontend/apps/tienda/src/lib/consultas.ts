// =============================================================================
// Consultas de la tienda
// =============================================================================
//
// Todo lo que la tienda lee de la base. Las escrituras viven en acciones.ts.
//
// Nada de esto se cachea con `unstable_cache` ni equivalentes: el catálogo
// cambia cuando la cocina se queda sin algo, y una tarjeta que sigue diciendo
// "disponible" cinco minutos después de agotarse produce un pedido que hay que
// cancelar. Para eso ya está el ISR de las páginas, con revalidación corta.

import { and, asc, desc, eq } from 'drizzle-orm';
import {
  pedidoEventos,
  pedidoItems,
  pedidos,
  productoOpciones,
  productos,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export interface OpcionProducto {
  id: string;
  grupo: string;
  etiqueta: string;
  sobreprecioCOP: number;
  seleccionMultiple: boolean;
  porDefecto: boolean;
}

export interface ProductoTienda {
  id: string;
  slug: string;
  nombre: string;
  gancho: string | null;
  descripcion: string | null;
  notas: string[];
  ingredientes: string[];
  maridaje: string[];
  precioCOP: number;
  imagen: string | null;
  familia: string | null;
  intensidad: number;
  pesoGramos: number | null;
  vegetariano: boolean;
  disponible: boolean;
  destacado: boolean;
}

function aProducto(p: typeof productos.$inferSelect): ProductoTienda {
  return {
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    gancho: p.gancho,
    descripcion: p.descripcion,
    notas: p.notas ?? [],
    ingredientes: p.ingredientes ?? [],
    maridaje: p.maridaje ?? [],
    precioCOP: p.precioCOP,
    imagen: p.imagen,
    familia: p.familia,
    intensidad: p.intensidad ?? 1,
    pesoGramos: p.pesoGramos,
    vegetariano: p.vegetariano ?? false,
    disponible: p.disponible,
    destacado: p.destacado ?? false,
  };
}

/**
 * El catálogo.
 *
 * Trae también lo que está agotado, marcado como no disponible. Esconderlo
 * sería peor: quien viene buscando su sabor de siempre y no lo encuentra
 * asume que ya no existe y se va, en lugar de pedir otro hoy y volver mañana.
 */
export async function catalogo(): Promise<ProductoTienda[]> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select()
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.orden), asc(productos.nombre));
    return filas.map(aProducto);
  });
}

/** Un producto con sus opciones de personalización. */
export async function producto(
  slug: string
): Promise<{ producto: ProductoTienda; opciones: OpcionProducto[] } | null> {
  return conBaseDeDatos(async (db) => {
    const [p] = await db
      .select()
      .from(productos)
      .where(and(eq(productos.slug, slug), eq(productos.activo, true)))
      .limit(1);

    if (!p) return null;

    const opciones = await db
      .select()
      .from(productoOpciones)
      .where(and(eq(productoOpciones.productoId, p.id), eq(productoOpciones.activo, true)))
      .orderBy(asc(productoOpciones.grupo), asc(productoOpciones.orden));

    return {
      producto: aProducto(p),
      opciones: opciones.map((o) => ({
        id: o.id,
        grupo: o.grupo,
        etiqueta: o.etiqueta,
        sobreprecioCOP: o.sobreprecioCOP,
        seleccionMultiple: o.seleccionMultiple,
        porDefecto: o.porDefecto ?? false,
      })),
    };
  });
}

/** Slugs publicados, para generar las rutas estáticas. */
export async function slugsPublicados(): Promise<string[]> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({ slug: productos.slug })
      .from(productos)
      .where(eq(productos.activo, true));
    return filas.map((f) => f.slug);
  });
}

export interface PedidoCompleto {
  codigo: string;
  estado: string;
  estadoPago: string;
  metodoPago: string;
  tipoEntrega: string;
  nombre: string;
  telefono: string;
  direccion: string | null;
  indicaciones: string | null;
  subtotalCOP: number;
  envioCOP: number;
  propinaCOP: number;
  totalCOP: number;
  notas: string | null;
  createdAt: Date | null;
  entregadoEn: Date | null;
  items: Array<{
    nombreProducto: string;
    cantidad: number;
    precioUnitarioCOP: number;
    subtotalCOP: number;
    opciones: Array<{ grupo: string; etiqueta: string; sobreprecio: number }>;
  }>;
  eventos: Array<{ estado: string; createdAt: Date | null; nota: string | null }>;
}

/**
 * Un pedido por su código, para el seguimiento.
 *
 * El código es la única llave: no hay sesión que exigir porque el pedido se
 * puede hacer como invitado, que es justo lo que evita perder la mitad de las
 * compras en un registro.
 *
 * Eso significa que quien tenga el código ve el pedido. Es aceptable a
 * propósito: el código es aleatorio, no correlativo — BZ-7K2M no permite
 * adivinar BZ-7K2N — y lo que se expone es lo que la persona ya sabe porque
 * acaba de pedirlo. No se devuelve nada que no estuviera en su propio recibo.
 */
export async function pedidoPorCodigo(codigo: string): Promise<PedidoCompleto | null> {
  return conBaseDeDatos(async (db) => {
    const [p] = await db
      .select()
      .from(pedidos)
      .where(eq(pedidos.codigo, codigo.toUpperCase()))
      .limit(1);

    if (!p) return null;

    const [items, eventos] = await Promise.all([
      db.select().from(pedidoItems).where(eq(pedidoItems.pedidoId, p.id)),
      db
        .select()
        .from(pedidoEventos)
        .where(eq(pedidoEventos.pedidoId, p.id))
        .orderBy(asc(pedidoEventos.createdAt)),
    ]);

    return {
      codigo: p.codigo,
      estado: p.estado,
      estadoPago: p.estadoPago,
      metodoPago: p.metodoPago,
      tipoEntrega: p.tipoEntrega,
      nombre: p.nombre,
      telefono: p.telefono,
      direccion: p.direccion,
      indicaciones: p.indicaciones,
      subtotalCOP: p.subtotalCOP,
      envioCOP: p.envioCOP,
      propinaCOP: p.propinaCOP,
      totalCOP: p.totalCOP,
      notas: p.notas,
      createdAt: p.createdAt,
      entregadoEn: p.entregadoEn,
      items: items.map((i) => ({
        nombreProducto: i.nombreProducto,
        cantidad: i.cantidad,
        precioUnitarioCOP: i.precioUnitarioCOP,
        subtotalCOP: i.subtotalCOP,
        opciones: i.opciones ?? [],
      })),
      eventos: eventos.map((e) => ({
        estado: e.estado,
        createdAt: e.createdAt,
        nota: e.nota,
      })),
    };
  });
}

/**
 * Los últimos pedidos de un teléfono.
 *
 * Es lo que hace posible "pedir de nuevo" sin obligar a crear una cuenta: el
 * teléfono ya identifica a la persona, y es el dato que de todas formas hay que
 * dar para recibir el pedido.
 */
export async function pedidosDeTelefono(telefono: string, limite = 5) {
  return conBaseDeDatos(async (db) => {
    return db
      .select({
        codigo: pedidos.codigo,
        estado: pedidos.estado,
        totalCOP: pedidos.totalCOP,
        createdAt: pedidos.createdAt,
      })
      .from(pedidos)
      .where(eq(pedidos.telefono, telefono))
      .orderBy(desc(pedidos.createdAt))
      .limit(limite);
  });
}
