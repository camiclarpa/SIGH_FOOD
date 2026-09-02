// =============================================================================
// Caja diaria — lecturas
// =============================================================================

import { and, between, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { cajaSesiones, pedidos, staffUsers } from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';

/**
 * Núcleo de `sesionAbierta()`, tomando un `db` ya abierto.
 *
 * Separado para que resumenFinanciero() (consultas-finanzas.ts) pueda
 * reusar la conexión que ya tiene abierta en vez de pedir una segunda a
 * Hyperdrive dentro de su propio Promise.all — eso fue justo el bug real que
 * tumbó /finanzas la primera vez que se probó en producción.
 */
export async function sesionAbiertaConDb(db: Database) {
  const [sesion] = await db
    .select()
    .from(cajaSesiones)
    .where(eq(cajaSesiones.estado, 'abierta'))
    .limit(1);

  if (!sesion) return null;

  // between()/eq() en vez de un `sql` crudo con `sesion.abiertaEn` (un `Date`
  // real: el select tipado de arriba ya lo convierte del string que devuelve
  // postgres.js). Un `Date` interpolado sin tipo en una plantilla `sql`
  // revienta bajo Hyperdrive —fetch_types: false no sabe serializarlo—; los
  // operadores tipados de drizzle sí, porque pasan cada valor por el mapeo
  // propio de la columna antes de mandarlo al driver.
  const [esperado] = await db
    .select({ total: sql<number>`COALESCE(SUM(${pedidos.totalCOP}), 0)::int` })
    .from(pedidos)
    .where(and(
      eq(pedidos.metodoPago, 'efectivo'),
      eq(pedidos.estadoPago, 'aprobado'),
      between(pedidos.pagoAprobadoEn, sesion.abiertaEn, new Date())
    ));

  return {
    ...sesion,
    efectivoEsperadoEnVivo: sesion.montoInicialCOP + Number(esperado?.total ?? 0),
  };
}

/**
 * La sesión abierta (si hay una), con el efectivo esperado calculado en vivo
 * — la misma consulta que usará `cerrarCaja()`, solo que aquí es de solo
 * lectura y no escribe nada.
 */
export async function sesionAbierta() {
  return conRespaldo('caja:abierta', () => conBaseDeDatos((db) => sesionAbiertaConDb(db)));
}

/** Sesiones cerradas, con el nombre de quién abrió y quién cerró. */
export async function historialCaja(limite = 30) {
  return conRespaldo('caja:historial', () => conBaseDeDatos(async (db) => {
    const abridores = alias(staffUsers, 'abridores');
    const cerradores = alias(staffUsers, 'cerradores');

    return db
      .select({
        id: cajaSesiones.id,
        montoInicialCOP: cajaSesiones.montoInicialCOP,
        efectivoContadoCOP: cajaSesiones.efectivoContadoCOP,
        efectivoEsperadoCOP: cajaSesiones.efectivoEsperadoCOP,
        diferenciaCOP: cajaSesiones.diferenciaCOP,
        abiertaEn: cajaSesiones.abiertaEn,
        cerradaEn: cajaSesiones.cerradaEn,
        abiertaPorNombre: abridores.fullName,
        cerradaPorNombre: cerradores.fullName,
        notasCierre: cajaSesiones.notasCierre,
      })
      .from(cajaSesiones)
      .leftJoin(abridores, eq(abridores.id, cajaSesiones.abiertaPor))
      .leftJoin(cerradores, eq(cerradores.id, cajaSesiones.cerradaPor))
      .where(eq(cajaSesiones.estado, 'cerrada'))
      .orderBy(desc(cajaSesiones.cerradaEn))
      .limit(limite);
  }));
}
