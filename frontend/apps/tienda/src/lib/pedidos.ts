// =============================================================================
// Creación de pedidos
// =============================================================================
//
// La operación que no se puede hacer mal: aquí es donde una persona se
// compromete a pagar y el negocio se compromete a entregar.
//
// La regla que gobierna este archivo: LOS PRECIOS NUNCA VIENEN DEL CLIENTE.
// El carrito del navegador manda qué producto y qué opciones, y el servidor
// vuelve a leer los importes de la base. Si se confiara en el precio enviado,
// bastaría con abrir las herramientas de desarrollo para pedir cinco conos a
// mil pesos — y no habría forma de notarlo hasta cuadrar la caja.

import { and, eq, inArray, sql, notInArray } from 'drizzle-orm';
import {
  b2cConsumers,
  pedidoEventos,
  pedidoItems,
  pedidos,
  productoOpciones,
  productos,
  qrCodes,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { ENVIO_COP } from '@/lib/envio';
import { aPreferencias } from '@/lib/paladar';

export interface LineaEntrante {
  slug: string;
  cantidad: number;
  /** Ids de producto_opciones elegidos. Los precios se leen aquí, no se envían. */
  opcionIds: string[];
  notas?: string;
}

export interface DatosPedido {
  nombre: string;
  telefono: string;
  tipoEntrega: 'domicilio' | 'recoger' | 'mesa';
  /**
   * Token del QR de la mesa, cuando el pedido entra desde el local.
   *
   * Se manda el TOKEN y no el local ni el número de mesa: el servidor lo
   * revalida contra la base. Si se confiara en lo que llega, cualquiera podría
   * mandar un accountId inventado y colar una comanda en otro local.
   */
  qrToken?: string;
  /**
   * Perfil de paladar del cuestionario.
   *
   * Se guarda en el comensal con la MISMA forma que ya usaban los escaneos en
   * mesa (flavorPreference: Record<linea, peso>), para que lo que dice que le
   * gusta y lo que pide de verdad se sumen en el mismo sitio en vez de vivir en
   * dos columnas que se contradicen.
   */
  paladar?: Record<string, string>;
  /**
   * De dónde vino la visita: primer toque, ya saneado por lib/atribucion.
   *
   * Se guarda con el pedido y no en una tabla aparte porque lo que hace falta
   * responder es «cuánto vendió este canal», y eso es un GROUP BY sobre la
   * misma fila que lleva el importe.
   */
  origen?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referidoPor?: string;
  };
  direccion?: string;
  indicaciones?: string;
  metodoPago: 'efectivo' | 'nequi' | 'daviplata' | 'tarjeta' | 'pse' | 'transferencia';
  propinaCOP?: number;
  notas?: string;
  lineas: LineaEntrante[];
}

/** Cuántas unidades de un mismo producto se aceptan en un pedido. */
const MAX_POR_LINEA = 20;
const MAX_LINEAS = 30;

/**
 * Código corto que se le dice a la persona: BZ-7K2M.
 *
 * Aleatorio y no correlativo a propósito. Un BZ-0001 seguido de BZ-0002 permite
 * a cualquiera recorrer los pedidos ajenos cambiando el número, y además le
 * cuenta a la competencia exactamente cuántos pedidos llevas.
 *
 * Sin vocales ni caracteres que se confunden al dictarlos por teléfono: sin O
 * contra 0, sin I contra 1.
 */
function generarCodigo(): string {
  const ALFABETO = '23456789ACDEFGHJKLMNPQRTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const cuerpo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `BZ-${cuerpo}`;
}

export type ResultadoPedido =
  | {
      ok: true;
      codigo: string;
      totalCOP: number;
      /** Nombres reales, para el comprobante. El slug no se le enseña a nadie. */
      lineas: Array<{ cantidad: number; nombre: string }>;
      /** Mesa asignada, si el pedido entró por un QR. */
      mesa: string | null;
    }
  | {
      ok: false;
      error: string;
      /*
        Qué se agotó y con qué se puede cambiar.

        Van aparte del mensaje para que la tienda pueda pintar un botón "cámbialo
        por X" en vez de obligar a volver al catálogo y rehacer el carrito. Quien
        llega al checkout ya decidió comprar: devolverle el trabajo es donde más
        gente se pierde.
      */
      agotado?: { slug: string; nombre: string };
      sustituto?: { slug: string; nombre: string; precio: number } | null;
    };

/**
 * Crea el pedido.
 *
 * Todo va dentro de una transacción: un pedido sin sus líneas es peor que
 * ningún pedido, porque aparece en la cocina como una comanda vacía y nadie
 * sabe qué preparar.
 */
export async function crearPedido(datos: DatosPedido): Promise<ResultadoPedido> {
  // --- Comprobaciones que no necesitan la base ---
  if (!datos.nombre?.trim()) return { ok: false, error: 'Falta el nombre' };
  if (!datos.telefono?.trim()) return { ok: false, error: 'Falta el teléfono' };
  if (!datos.lineas?.length) return { ok: false, error: 'El carrito está vacío' };
  if (datos.lineas.length > MAX_LINEAS) return { ok: false, error: 'Demasiados productos en el pedido' };

  if (datos.tipoEntrega === 'domicilio' && !datos.direccion?.trim()) {
    return { ok: false, error: 'Falta la dirección de entrega' };
  }

  if (datos.tipoEntrega === 'mesa' && !datos.qrToken?.trim()) {
    return { ok: false, error: 'Escanea el QR de tu mesa para pedir desde aquí' };
  }

  for (const l of datos.lineas) {
    if (!Number.isInteger(l.cantidad) || l.cantidad < 1 || l.cantidad > MAX_POR_LINEA) {
      return { ok: false, error: `Cantidad no válida para ${l.slug}` };
    }
  }

  const telefono = normalizarTelefono(datos.telefono);
  if (!telefono) return { ok: false, error: 'El teléfono no parece válido' };

  const propina = Math.max(0, Math.trunc(datos.propinaCOP ?? 0));

  return conBaseDeDatos(async (db) => {
    // --- Los precios se leen de la base, SIEMPRE ---
    const slugs = [...new Set(datos.lineas.map((l) => l.slug))];
    const encontrados = await db
      .select()
      .from(productos)
      .where(and(inArray(productos.slug, slugs), eq(productos.activo, true)));

    const porSlug = new Map(encontrados.map((p) => [p.slug, p]));

    /*
      Disponibilidad.

      Se comprueba al crear y no solo al pintar el catálogo: entre que alguien
      añade algo al carrito y paga pueden pasar horas, y la cocina puede haberse
      quedado sin ese sabor mientras tanto.

      Cuando algo se agota NO basta con dar el error. Quien llega hasta aquí ya
      decidió comprar, ya tecleó su teléfono y su dirección: es el punto del
      embudo donde más caro sale perder a alguien. Decirle "quítalo del carrito"
      le devuelve el trabajo a él y muchos abandonan ahí.

      Así que se le ofrece un sustituto concreto y se deja que decida. El
      servidor NO cambia el pedido por su cuenta: sustituir un sabor sin
      preguntar entrega algo que nadie pidió, y eso es peor que perder la venta.
    */
    const agotados = slugs.map((s) => porSlug.get(s)).filter((p) => p && !p.disponible);
    const inexistentes = slugs.filter((s) => !porSlug.has(s));

    if (inexistentes.length > 0) {
      return { ok: false as const, error: 'Uno de los productos ya no está disponible' };
    }

    if (agotados.length > 0) {
      const falta = agotados[0]!;

      // Un sustituto del mismo precio, disponible, que no esté ya en el
      // carrito. Del mismo precio para que la sugerencia no obligue a recalcular
      // ni sorprenda con un cobro distinto.
      const [sustituto] = await db
        .select({ slug: productos.slug, nombre: productos.nombre, precio: productos.precioCOP })
        .from(productos)
        .where(
          and(
            eq(productos.activo, true),
            eq(productos.disponible, true),
            eq(productos.precioCOP, falta.precioCOP),
            notInArray(productos.slug, slugs)
          )
        )
        .limit(1);

      return {
        ok: false as const,
        error: sustituto
          ? `${falta.nombre} se acaba de agotar. ¿Te sirve ${sustituto.nombre}? Cuesta lo mismo.`
          : `${falta.nombre} se acaba de agotar. Quítalo del carrito para seguir con el resto.`,
        // La tienda usa esto para ofrecer el cambio con un botón, en vez de
        // obligar a volver al catálogo y rehacer el carrito a mano.
        agotado: { slug: falta.slug, nombre: falta.nombre },
        sustituto: sustituto ?? null,
      };
    }

    // Las opciones también: su sobreprecio sale de la base.
    const idsOpciones = [...new Set(datos.lineas.flatMap((l) => l.opcionIds ?? []))];
    const opciones = idsOpciones.length
      ? await db
          .select()
          .from(productoOpciones)
          .where(and(inArray(productoOpciones.id, idsOpciones), eq(productoOpciones.activo, true)))
      : [];
    const porId = new Map(opciones.map((o) => [o.id, o]));

    // --- Se arman las líneas con los importes del servidor ---
    const lineas = datos.lineas.map((l) => {
      const p = porSlug.get(l.slug)!;

      const elegidas = (l.opcionIds ?? [])
        .map((id) => porId.get(id))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        // Una opción de OTRO producto no cuenta: sin esto se podría colar el
        // sobreprecio de cero de un producto para abaratar otro.
        .filter((o) => o.productoId === p.id);

      const sobreprecio = elegidas.reduce((s, o) => s + o.sobreprecioCOP, 0);
      const unitario = p.precioCOP + sobreprecio;

      return {
        productoId: p.id,
        nombreProducto: p.nombre,
        cantidad: l.cantidad,
        precioUnitarioCOP: p.precioCOP,
        opciones: elegidas.map((o) => ({
          grupo: o.grupo,
          etiqueta: o.etiqueta,
          sobreprecio: o.sobreprecioCOP,
        })),
        subtotalCOP: unitario * l.cantidad,
        notas: l.notas?.trim().slice(0, 255) || null,
      };
    });

    // --- Mesa: el token se revalida, nunca se cree lo que llega ---
    let accountId: string | null = null;
    let mesa: string | null = null;

    if (datos.tipoEntrega === 'mesa') {
      const [qr] = await db
        .select({ accountId: qrCodes.accountId, mesa: qrCodes.tableNumber })
        .from(qrCodes)
        .where(and(eq(qrCodes.qrToken, datos.qrToken!.trim()), eq(qrCodes.isActive, true)))
        .limit(1);

      if (!qr) {
        return {
          ok: false as const,
          error: 'Ese código de mesa ya no vale. Vuelve a escanear el QR.',
        };
      }

      accountId = qr.accountId;
      mesa = qr.mesa;
    }

    const subtotal = lineas.reduce((s, l) => s + l.subtotalCOP, 0);
    // En mesa no hay envío: la persona ya está en el local.
    const envio = datos.tipoEntrega === 'domicilio' ? ENVIO_COP : 0;
    const total = subtotal + envio + propina;

    // --- Comensal ---
    // Se busca o se crea por teléfono. Es la identidad en B2C: sin contraseña,
    // sin registro, y ya lo tiene que dar para recibir el pedido. Eso además
    // conecta el pedido con sus puntos y su historial en el CRM.
    const [comensal] = await db
      .select({ id: b2cConsumers.id })
      .from(b2cConsumers)
      .where(eq(b2cConsumers.whatsappPhone, telefono))
      .limit(1);

    let consumerId = comensal?.id ?? null;
    if (!consumerId) {
      const [nuevo] = await db
        .insert(b2cConsumers)
        .values({ whatsappPhone: telefono, fullName: datos.nombre.trim() })
        // Si dos pedidos del mismo número entran a la vez, el índice único
        // rechaza el segundo insert en lugar de reventar la transacción entera.
        .onConflictDoNothing({ target: b2cConsumers.whatsappPhone })
        .returning({ id: b2cConsumers.id });

      consumerId = nuevo?.id ?? null;
      if (!consumerId) {
        const [existente] = await db
          .select({ id: b2cConsumers.id })
          .from(b2cConsumers)
          .where(eq(b2cConsumers.whatsappPhone, telefono))
          .limit(1);
        consumerId = existente?.id ?? null;
      }
    }

    // --- Paladar ---
    // Se fusiona con lo que ya hubiera en vez de sustituirlo: alguien que ya
    // tenía preferencias por sus escaneos no debería perderlas por rellenar un
    // cuestionario de tres preguntas.
    if (consumerId && datos.paladar && Object.keys(datos.paladar).length > 0) {
      try {
        const preferencias = aPreferencias(datos.paladar);
        if (Object.keys(preferencias).length > 0) {
          await db
            .update(b2cConsumers)
            .set({
              flavorPreference: sql`COALESCE(${b2cConsumers.flavorPreference}, '{}'::jsonb) || ${JSON.stringify(preferencias)}::jsonb`,
            })
            .where(eq(b2cConsumers.id, consumerId));
        }
      } catch {
        // Un perfil que no se guarda no puede impedir un pedido: es un extra.
      }
    }

    // --- El pedido, entero o nada ---
    const codigo = await db.transaction(async (tx) => {
      // Se reintenta con un código nuevo si hubiera colisión. Con 30^6
      // combinaciones es improbable, pero "improbable" no es "imposible" y el
      // fallo sería un 500 justo al pagar.
      let cod = generarCodigo();
      for (let intento = 0; intento < 5; intento++) {
        const [choque] = await tx
          .select({ id: pedidos.id })
          .from(pedidos)
          .where(eq(pedidos.codigo, cod))
          .limit(1);
        if (!choque) break;
        cod = generarCodigo();
      }

      const [cabecera] = await tx
        .insert(pedidos)
        .values({
          codigo: cod,
          consumerId,
          nombre: datos.nombre.trim().slice(0, 150),
          telefono,
          tipoEntrega: datos.tipoEntrega,
          direccion: datos.direccion?.trim().slice(0, 255) || null,
          indicaciones: datos.indicaciones?.trim().slice(0, 255) || null,
          accountId,
          mesa,
          qrToken: datos.qrToken?.trim().slice(0, 255) || null,
          metodoPago: datos.metodoPago,
          // Contra entrega el pago no existe todavía; con pasarela lo marcará
          // ella cuando confirme. En ningún caso se da por aprobado aquí.
          estadoPago: 'pendiente',
          subtotalCOP: subtotal,
          envioCOP: envio,
          propinaCOP: propina,
          totalCOP: total,
          notas: datos.notas?.trim().slice(0, 1000) || null,
          // El origen se pega al pedido en el mismo INSERT: es el único momento
          // en que existe. Vive en sessionStorage del navegador y desaparece al
          // cerrar la pestaña, así que si no se escribe aquí no lo recupera
          // nadie — ni ahora ni dentro de un año.
          utmSource: datos.origen?.utmSource?.slice(0, 80) || null,
          utmMedium: datos.origen?.utmMedium?.slice(0, 80) || null,
          utmCampaign: datos.origen?.utmCampaign?.slice(0, 120) || null,
          referidoPor: datos.origen?.referidoPor?.slice(0, 120) || null,
        })
        .returning({ id: pedidos.id, codigo: pedidos.codigo });

      await tx.insert(pedidoItems).values(
        lineas.map((l) => ({ ...l, pedidoId: cabecera.id }))
      );

      // El primer evento se escribe aquí y no se deduce después: el seguimiento
      // debe poder pintarse leyendo solo la tabla de eventos.
      await tx.insert(pedidoEventos).values({
        pedidoId: cabecera.id,
        estado: 'recibido',
        nota: 'Pedido recibido desde la tienda',
      });

      return cabecera.codigo;
    });

    return {
      ok: true as const,
      codigo,
      totalCOP: total,
      lineas: lineas.map((l) => ({ cantidad: l.cantidad, nombre: l.nombreProducto })),
      mesa,
    };
  });
}

/**
 * Normaliza el teléfono a E.164 sin '+'.
 *
 * El mismo formato que usa la pasarela de WhatsApp del CRM. Guardarlo de dos
 * maneras partiría a la misma persona en dos fichas y le perdería el historial
 * justo cuando vuelve a pedir.
 */
export function normalizarTelefono(bruto: string): string | null {
  if (!bruto) return null;
  let n = bruto.replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 10 && n.startsWith('3')) n = '57' + n;
  if (n.length < 8 || n.length > 15) return null;
  return n;
}
