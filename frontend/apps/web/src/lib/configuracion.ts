// =============================================================================
// Lectura de los umbrales calibrados
// =============================================================================
//
// Separado de acciones/agente.ts porque ese archivo lleva 'use server'. Aquí
// vive la LECTURA, que la usan las consultas y las pantallas.

import { configuracion } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { valoresPorDefecto } from '@/lib/umbrales';

/**
 * Umbrales en uso: lo guardado pisa al valor de diseño.
 *
 * Devuelve SIEMPRE un valor para cada clave. Un umbral que pudiera venir
 * `undefined` obligaría a poner un `?? 15` en cada punto de uso, y basta que
 * uno lleve otro número para que dos pantallas discrepen sobre quién está en
 * riesgo.
 */
export async function umbralesActuales(): Promise<Record<string, number>> {
  const valores = { ...valoresPorDefecto() };

  try {
    const filas = await conBaseDeDatos((db) => db.select().from(configuracion));
    for (const f of filas) {
      const v = Number(f.valor);
      if (Number.isFinite(v)) valores[f.clave] = v;
    }
  } catch {
    // Si la configuración no se puede leer, se opera con los valores de diseño.
    // Es preferible a que el CRM entero caiga por no poder leer un ajuste.
  }

  return valores;
}

/** Un umbral concreto, con su valor de diseño como respaldo. */
export async function umbral(clave: string): Promise<number> {
  return (await umbralesActuales())[clave];
}
