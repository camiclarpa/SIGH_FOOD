// Catálogo mínimo para el desplegable de alta de lote.
//
// Aparte de lib/calidad.ts a propósito: aquello responde preguntas de control de
// calidad y esto solo trae nombres para un formulario. Mezclarlos haría que una
// pantalla que necesita dos nombres arrastre las consultas de agregación.

import { asc, eq } from 'drizzle-orm';
import { productos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export async function catalogoSimple(): Promise<Array<{ id: string; nombre: string }>> {
  return conBaseDeDatos((db) =>
    db
      .select({ id: productos.id, nombre: productos.nombre })
      .from(productos)
      // Solo los activos: dar de alta una tanda de algo despublicado casi
      // siempre es haberse equivocado de fila en el desplegable.
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.nombre))
  );
}
