// =============================================================================
// SIGH_FOOD - Listado de cuentas B2B
// Endpoint: GET /api/accounts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { accounts } from '@sighfood/domain/db/schema';
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';

const ORDENABLES = {
  nombre: accounts.name,
  zona: accounts.zone,
  creado: accounts.createdAt,
  actividad: accounts.lastActivity,
  churn: accounts.churnScore,
  stock: accounts.currentConsignationStock,
} as const;

const consultaSchema = z.object({
  // Techo de 100: sin él, un `?limite=100000` obliga a Postgres a materializar
  // la tabla entera y a serializarla en la respuesta.
  limite: z.coerce.number().int().min(1).max(100).default(25),
  pagina: z.coerce.number().int().min(1).default(1),
  etapa: z.string().optional(),
  zona: z.string().optional(),
  riesgo: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  buscar: z.string().trim().min(1).max(120).optional(),
  orden: z.enum(['nombre', 'zona', 'creado', 'actividad', 'churn', 'stock']).default('creado'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

export const GET = conTrazas('/api/accounts', async (request: NextRequest) => {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const validacion = consultaSchema.safeParse(params);

    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: validacion.error.issues },
        { status: 400 }
      );
    }

    const { limite, pagina, etapa, zona, riesgo, buscar, orden, dir } = validacion.data;
    const salto = (pagina - 1) * limite;

    const filtros: SQL[] = [];
    if (etapa) filtros.push(eq(accounts.pipelineStage, etapa as never));
    if (zona) filtros.push(eq(accounts.zone, zona));
    if (riesgo) filtros.push(eq(accounts.churnRisk, riesgo));
    if (buscar) {
      const patron = `%${buscar}%`;
      const porTexto = or(
        ilike(accounts.name, patron),
        ilike(accounts.commercialName, patron),
        ilike(accounts.email, patron),
        ilike(accounts.decisionMakerName, patron)
      );
      if (porTexto) filtros.push(porTexto);
    }

    const donde = filtros.length > 0 ? and(...filtros) : undefined;
    const columna = ORDENABLES[orden];
    const ordenacion = dir === 'asc' ? asc(columna) : desc(columna);

    return await conBaseDeDatos(async (db) => {
      // El total va en su propia consulta y no contando las filas devueltas:
      // con paginación, `filas.length` es el tamaño de la página, no el total.
      // Ambas en paralelo porque no dependen entre sí.
      const [filas, [{ total }]] = await Promise.all([
        db
          .select({
            id: accounts.id,
            nombre: accounts.name,
            nombreComercial: accounts.commercialName,
            zona: accounts.zone,
            etapa: accounts.pipelineStage,
            contacto: accounts.decisionMakerName,
            rolContacto: accounts.decisionMakerRole,
            telefono: accounts.phone,
            email: accounts.email,
            stock: accounts.currentConsignationStock,
            umbralAlerta: accounts.reorderAlertThreshold,
            riesgoChurn: accounts.churnRisk,
            puntuacionChurn: accounts.churnScore,
            nivelLead: accounts.leadScore,
            probabilidadConversion: accounts.conversionProb,
            compromiso: accounts.engagementScore,
            ultimaActividad: accounts.lastActivity,
            creado: accounts.createdAt,
          })
          .from(accounts)
          .where(donde)
          .orderBy(ordenacion)
          .limit(limite)
          .offset(salto),
        db.select({ total: count(accounts.id) }).from(accounts).where(donde),
      ]);

      return NextResponse.json({
        success: true,
        data: filas,
        paginacion: {
          pagina,
          limite,
          total,
          paginas: Math.max(1, Math.ceil(total / limite)),
        },
      });
    });
  } catch (error) {
    log.error('Error listando cuentas', error, { ruta: '/api/accounts' });
    return NextResponse.json(
      { success: false, error: 'Error al listar cuentas' },
      { status: 500 }
    );
  }
});
