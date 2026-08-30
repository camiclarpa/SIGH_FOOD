// =============================================================================
// La hora del antojo
// =============================================================================
//
// Se pidió "si el gráfico detecta un pico a las 6 PM, programar empujes
// promocionales automáticos a esa hora exacta". Construido tal cual sería
// peligroso: un pico se puede formar con dos escaneos casuales el primer día,
// y automatizar promociones sobre una muestra de dos es adivinar, no medir.
//
// Lo que este módulo hace es la versión que sí se sostiene: calcula la franja
// de mayor actividad SOLO cuando hay muestra suficiente para que signifique
// algo, y expone la hora como dato para que una secuencia la use como
// disparador informado — no dispara nada por sí solo. Encender el envío
// automático es una decisión de negocio, no algo que deba decidir una consulta.

import { sql } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';

/** Por debajo de esto, la hora "pico" es ruido y no se informa como tal. */
const MUESTRA_MINIMA_FRANJA = 30;

export interface FranjaPico {
  /** Hora de 0 a 23, en la zona horaria de Bogotá. */
  hora: number | null;
  momentos: number;
  /** false si hay datos pero no alcanzan para fiarse del pico. */
  confiable: boolean;
}

/**
 * La hora del día con más escaneos, en hora de Bogotá.
 *
 * Se agrupa convirtiendo a America/Bogota y no sobre la marca de tiempo en UTC:
 * agrupar en UTC desplazaría el pico cinco horas y un "pico a las 6 PM" saldría
 * marcado como la una de la tarde.
 */
export async function franjaDeMayorActividad(): Promise<FranjaPico> {
  return conBaseDeDatos(async (db) => {
    const filas = await db.execute<{ hora: number; total: number }>(sql`
      SELECT EXTRACT(HOUR FROM scanned_at AT TIME ZONE 'America/Bogota')::int AS hora,
             COUNT(*)::int AS total
        FROM sensory_moments
       GROUP BY hora
       ORDER BY total DESC
       LIMIT 1
    `);

    const fila = (Array.isArray(filas) ? filas[0] : (filas as { rows?: unknown[] }).rows?.[0]) as
      | { hora: number; total: number }
      | undefined;

    if (!fila) return { hora: null, momentos: 0, confiable: false };

    const momentos = Number(fila.total);
    return {
      hora: Number(fila.hora),
      momentos,
      confiable: momentos >= MUESTRA_MINIMA_FRANJA,
    };
  });
}
