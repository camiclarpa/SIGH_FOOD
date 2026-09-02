// =============================================================================
// SIGH_FOOD - Exportación de datos a CSV
// Endpoint: GET /api/exportar?tabla=comensales
// =============================================================================
//
// Exportar es una operación sensible aunque solo lea: un CSV con el WhatsApp de
// todos los comensales es exactamente el dato que no debe salir sin control. Por
// eso exige el permiso `datos.exportar`, que el rol de solo lectura no tiene.

import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import {
  accounts,
  b2cConsumers,
  consumerBadges,
  badges,
  pointTransactions,
  redemptions,
  rewards,
  sensoryMoments,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import type { Database } from '@sighfood/domain/db';

/**
 * Toda exportación devuelve filas planas.
 *
 * El tipo se declara aquí y no se infiere: cada consulta selecciona columnas
 * distintas, y sin un tipo común TypeScript adopta la forma de la primera y
 * rechaza las demás.
 */
type Consulta = (db: Database) => Promise<Record<string, unknown>[]>;

interface Exportable {
  /** Va en el nombre del archivo descargado. */
  nombre: string;
  consulta: Consulta;
}

/** Tope por exportación. Sin él, una tabla grande agotaría la memoria del Worker. */
const MAX_FILAS = 10_000;

/**
 * Escapa un valor para CSV.
 *
 * Se entrecomilla siempre que aparezca una coma, una comilla o un salto de
 * línea. Y un valor que empiece por =, +, - o @ se prefija con un apóstrofo:
 * Excel interpreta eso como fórmula, y un nombre como "=1+1" se convertiría en
 * un cálculo al abrir el archivo. Es la vía clásica de inyección en CSV.
 */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';

  let texto = valor instanceof Date ? valor.toISOString() : String(valor);

  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[",\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;

  return texto;
}

function aCsv(filas: Record<string, unknown>[], cabeceras: string[]): string {
  const lineas = [cabeceras.map(celda).join(',')];
  for (const f of filas) lineas.push(cabeceras.map((c) => celda(f[c])).join(','));
  // CRLF y BOM: Excel en Windows abre mal los acentos sin ellos, y este CRM
  // trabaja en español.
  return '﻿' + lineas.join('\r\n');
}

const TABLAS: Record<string, Exportable> = {
  comensales: {
    nombre: 'comensales',
    consulta: (db: Database) =>
      db
        .select({
          id: b2cConsumers.id,
          nombre: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          email: b2cConsumers.email,
          nivel: b2cConsumers.membershipTier,
          puntos: b2cConsumers.points,
          cashback: b2cConsumers.cashbackBalance,
          ltv: b2cConsumers.ltv,
          codigo_referido: b2cConsumers.referralCode,
          alta: b2cConsumers.createdAt,
          // Literal calificado: `.from(b2cConsumers)` es la única tabla del
          // query externo, y drizzle compila `${b2cConsumers.id}` sin
          // qualificar ahí dentro (sale "id" a secas) — como sensory_moments
          // también tiene su propia columna id, la comparación no hacía
          // match nunca. Bug real y confirmado.
          momentos: sql<number>`(
            SELECT COUNT(*)::int FROM ${sensoryMoments}
            WHERE ${sensoryMoments.consumerId} = b2c_consumers.id
          )`,
          ultimo_momento: sql<Date | null>`(
            SELECT MAX(${sensoryMoments.scannedAt}) FROM ${sensoryMoments}
            WHERE ${sensoryMoments.consumerId} = b2c_consumers.id
          )`,
        })
        .from(b2cConsumers)
        .orderBy(desc(b2cConsumers.createdAt))
        .limit(MAX_FILAS),
  },

  momentos: {
    nombre: 'momentos-sensoriales',
    consulta: (db: Database) =>
      db
        .select({
          id: sensoryMoments.id,
          fecha: sensoryMoments.scannedAt,
          linea: sensoryMoments.productLine,
          comensal: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          bar: accounts.name,
          zona: accounts.zone,
        })
        .from(sensoryMoments)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, sensoryMoments.consumerId))
        .leftJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .orderBy(desc(sensoryMoments.scannedAt))
        .limit(MAX_FILAS),
  },

  puntos: {
    nombre: 'movimientos-de-puntos',
    consulta: (db: Database) =>
      db
        .select({
          fecha: pointTransactions.createdAt,
          comensal: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          puntos: pointTransactions.puntos,
          motivo: pointTransactions.motivo,
          descripcion: pointTransactions.descripcion,
          saldo_resultante: pointTransactions.saldoResultante,
        })
        .from(pointTransactions)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, pointTransactions.consumerId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(MAX_FILAS),
  },

  canjes: {
    nombre: 'canjes',
    consulta: (db: Database) =>
      db
        .select({
          codigo: redemptions.codigo,
          estado: redemptions.estado,
          premio: rewards.nombre,
          puntos: redemptions.puntosGastados,
          comensal: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          emitido: redemptions.createdAt,
          entregado: redemptions.canjeadoEn,
          caduca: redemptions.expiraEn,
        })
        .from(redemptions)
        .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, redemptions.consumerId))
        .orderBy(desc(redemptions.createdAt))
        .limit(MAX_FILAS),
  },

  insignias: {
    nombre: 'insignias-desbloqueadas',
    consulta: (db: Database) =>
      db
        .select({
          fecha: consumerBadges.desbloqueadaEn,
          insignia: badges.nombre,
          comensal: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          valor_al_desbloquear: consumerBadges.valorAlDesbloquear,
        })
        .from(consumerBadges)
        .innerJoin(badges, eq(badges.id, consumerBadges.badgeId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, consumerBadges.consumerId))
        .orderBy(desc(consumerBadges.desbloqueadaEn))
        .limit(MAX_FILAS),
  },
};

export type TablaExportable = keyof typeof TABLAS;

export const GET = conTrazas('/api/exportar', async (request: NextRequest) => {
  try {
    const actor = await exigir('datos.exportar');

    const tabla = request.nextUrl.searchParams.get('tabla') as TablaExportable | null;
    if (!tabla || !(tabla in TABLAS)) {
      return NextResponse.json(
        { success: false, error: 'Tabla no válida', disponibles: Object.keys(TABLAS) },
        { status: 400 }
      );
    }

    const definicion = TABLAS[tabla];
    const filas = await conBaseDeDatos((db) => definicion.consulta(db));

    if (filas.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay datos que exportar' }, { status: 404 });
    }

    // Queda registrado quién se llevó qué: una exportación de datos personales
    // debe poder auditarse después.
    log.info('Datos exportados', {
      ruta: '/api/exportar',
      detalle: [actor.email, tabla, `${filas.length} filas`],
    });

    const cabeceras = Object.keys(filas[0]);
    const csv = aCsv(filas, cabeceras);
    const sello = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sighfood-${definicion.nombre}-${sello}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof SinPermiso) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 });
    }
    log.error('Error al exportar', e, { ruta: '/api/exportar' });
    return NextResponse.json({ success: false, error: 'Error al exportar' }, { status: 500 });
  }
});
