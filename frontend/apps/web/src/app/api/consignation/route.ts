// =============================================================================
// SIGH_FOOD - Endpoint de Control de Inventario en Consignacion
// Endpoints: 
//   POST   /api/consignation          - Registrar entrega de unidades
//   GET    /api/consignation          - Consultar historial por cuenta
//   PATCH  /api/consignation          - Actualizar unidades vendidas y estado
// Descripcion: Gestion de entregas y reconciliacion de inventario
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consignationLogs, accounts } from '@sighfood/domain/db/schema';
import { eq, and, desc, lt, sum, count, sql } from 'drizzle-orm';
import { obtenerDb } from '@/lib/cloudflare';

// =============================================================================
// Schemas de validacion con Zod
// =============================================================================

const createConsignationSchema = z.object({
  account_id: z.string().uuid('El account_id debe ser un UUID valido'),
  units_delivered: z.number()
    .int('Las unidades deben ser un numero entero')
    .min(1, 'Se debe entregar al menos 1 unidad')
    .max(1000, 'No se pueden entregar mas de 1000 unidades de una vez'),
  unit_price: z.number()
    .min(0, 'El precio unitario no puede ser negativo')
    .default(21000.00),
});

const updateConsignationSchema = z.object({
  log_id: z.string().uuid('El log_id debe ser un UUID valido'),
  units_sold: z.number()
    .int('Las unidades vendidas deben ser un numero entero')
    .min(0, 'Las unidades vendidas no pueden ser negativas'),
  settlement_status: z.enum([
    'pending',
    'reconciled',
    'invoiced',
    'cancelled'
  ], 'Estado de liquidacion invalido').optional(),
});

const listConsignationSchema = z.object({
  account_id: z.string().uuid('El account_id debe ser un UUID valido'),
  limit: z.number().int().min(1).max(100).default(50),
  status: z.enum(['pending', 'reconciled', 'invoiced', 'cancelled']).optional(),
  // Paginación por cursor: marca de tiempo del último elemento de la página
  // anterior. Se prefiere a OFFSET porque OFFSET obliga a Postgres a leer y
  // descartar todas las filas anteriores, así que la página 100 cuesta cien
  // veces más que la primera.
  cursor: z.string().datetime({ offset: true }).optional(),
});

// =============================================================================
// POST Handler - Registrar entrega de unidades en consignacion
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = createConsignationSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Error: Validacion fallida:', validationResult.error.issues);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos invalidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const db = await obtenerDb();

    // =============================================================================
    // 1. Validar que la cuenta exista
    // =============================================================================
    console.log('Validando account_id:', data.account_id);
    
    const accountResult = await db.select()
      .from(accounts)
      .where(eq(accounts.id, data.account_id))
      .limit(1);
    
    if (!accountResult[0]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La cuenta especificada no existe' 
        },
        { status: 404 }
      );
    }
    
    console.log('Cuenta valida:', accountResult[0].name);

    // =============================================================================
    // 2. Calcular monto total de la entrega
    // =============================================================================
    const totalAmount = data.units_delivered * data.unit_price;
    console.log('Entrega:', data.units_delivered, 'unidades x', data.unit_price, '=', totalAmount);

    // =============================================================================
    // 3. Registrar la entrega en consignationLogs
    // =============================================================================
    const [newLog] = await db.insert(consignationLogs).values({
      accountId: data.account_id,
      unitsDelivered: data.units_delivered,
      unitsSold: 0,
      unitPrice: data.unit_price.toString(),
      settlementStatus: 'pending',
      dispatchedAt: new Date(),
    }).returning();
    
    console.log('Entrega registrada exitosamente:', newLog.id);

    // =============================================================================
    // 4. Actualizar el stock actual de la cuenta
    // =============================================================================
    const currentStock = accountResult[0].currentConsignationStock || 0;
    const newStock = currentStock + data.units_delivered;
    
    await db.update(accounts)
      .set({ currentConsignationStock: newStock })
      .where(eq(accounts.id, data.account_id));
    
    console.log('Stock actualizado:', currentStock, '->', newStock);

    // =============================================================================
    // 5. Retornar respuesta
    // =============================================================================
    return NextResponse.json(
      { 
        success: true,
        message: 'Entrega registrada exitosamente',
        data: {
          id: newLog.id,
          account_id: newLog.accountId,
          units_delivered: newLog.unitsDelivered,
          units_sold: newLog.unitsSold,
          unit_price: parseFloat(newLog.unitPrice || '0'),
          total_amount: totalAmount,
          settlement_status: newLog.settlementStatus,
          dispatched_at: newLog.dispatchedAt,
          new_stock: newStock,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error en POST /api/consignation:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Consultar historial de consignacion por cuenta
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    
    // Obtener parametros de query
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const statusFilter = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    
    if (!accountId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El parametro account_id es requerido' 
        },
        { status: 400 }
      );
    }
    
    // Validar parametros
    const validationResult = listConsignationSchema.safeParse({
      account_id: accountId,
      limit: limitParam ? parseInt(limitParam) : 50,
      status: statusFilter || undefined,
      cursor: searchParams.get('cursor') || undefined,
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parametros invalidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const db = await obtenerDb();

    // =============================================================================
    // 1. Validar que la cuenta exista
    // =============================================================================
    const accountResult = await db.select()
      .from(accounts)
      .where(eq(accounts.id, data.account_id))
      .limit(1);
    
    if (!accountResult[0]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La cuenta especificada no existe' 
        },
        { status: 404 }
      );
    }

    // =============================================================================
    // 2. Construir la consulta con filtros opcionales
    // =============================================================================
    console.log('Buscando historial para account_id:', data.account_id);
    
    const filtros = [eq(consignationLogs.accountId, data.account_id)];
    if (data.status) {
      filtros.push(eq(consignationLogs.settlementStatus, data.status));
    }

    // Se pide un elemento de más para saber si queda página siguiente sin
    // necesidad de un COUNT aparte.
    const filtrosPagina = data.cursor
      ? [...filtros, lt(consignationLogs.dispatchedAt, new Date(data.cursor))]
      : filtros;

    // Los totales se calculan en la base sobre TODAS las filas que cumplen el
    // filtro, no sobre la página. Antes se sumaban con reduce() sobre los 50
    // registros devueltos, así que el resumen de una cuenta con más de 50
    // entregas mostraba cifras menores que las reales.
    const [consignationPagina, [totales]] = await Promise.all([
      db.select()
        .from(consignationLogs)
        .where(and(...filtrosPagina))
        .orderBy(desc(consignationLogs.dispatchedAt))
        .limit(data.limit + 1),
      db.select({
        entregadas: sum(consignationLogs.unitsDelivered),
        vendidas: sum(consignationLogs.unitsSold),
        ingresos: sql<string>`coalesce(sum(${consignationLogs.unitsSold} * ${consignationLogs.unitPrice}), 0)`,
        registros: count(consignationLogs.id),
      })
        .from(consignationLogs)
        .where(and(...filtros)),
    ]);

    const hayMas = consignationPagina.length > data.limit;
    const consignationList = hayMas ? consignationPagina.slice(0, data.limit) : consignationPagina;
    const siguienteCursor = hayMas
      ? consignationList[consignationList.length - 1]?.dispatchedAt?.toISOString() ?? null
      : null;

    // =============================================================================
    // 3. Totales (calculados en la base, no sobre la página)
    // =============================================================================
    const totalDelivered = Number(totales?.entregadas ?? 0);
    const totalSold = Number(totales?.vendidas ?? 0);
    const totalPending = totalDelivered - totalSold;
    // Usa el precio real de cada registro en lugar de asumir 21000 fijo.
    const totalRevenue = Number(totales?.ingresos ?? 0);

    // =============================================================================
    // 4. Formatear respuesta
    // =============================================================================
    const formattedList = consignationList.map(log => ({
      id: log.id,
      account_id: log.accountId,
      units_delivered: log.unitsDelivered,
      units_sold: log.unitsSold,
      units_pending: (log.unitsDelivered || 0) - (log.unitsSold || 0),
      unit_price: parseFloat(log.unitPrice || '0'),
      total_amount: (log.unitsDelivered || 0) * parseFloat(log.unitPrice || '0'),
      settlement_status: log.settlementStatus,
      dispatched_at: log.dispatchedAt,
      settled_at: log.settledAt,
    }));

    return NextResponse.json(
      { 
        success: true,
        message: `Se encontraron ${consignationList.length} registros de consignacion`,
        summary: {
          total_delivered: totalDelivered,
          total_sold: totalSold,
          total_pending: totalPending,
          total_revenue: totalRevenue,
        },
        count: consignationList.length,
        // Total real de registros que cumplen el filtro, no los de esta página.
        total_records: Number(totales?.registros ?? 0),
        pagination: {
          limit: data.limit,
          has_more: hayMas,
          // Pásalo como ?cursor=... para pedir la página siguiente.
          next_cursor: siguienteCursor,
        },
        data: formattedList,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error en GET /api/consignation:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH Handler - Actualizar unidades vendidas y estado de liquidacion
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = updateConsignationSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Error: Validacion fallida:', validationResult.error.issues);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos invalidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const db = await obtenerDb();

    // =============================================================================
    // 1. Verificar que el registro de consignacion exista
    // =============================================================================
    console.log('Buscando registro de consignacion con id:', data.log_id);
    
    const logResult = await db.select()
      .from(consignationLogs)
      .where(eq(consignationLogs.id, data.log_id))
      .limit(1);
    
    if (!logResult[0]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El registro de consignacion especificado no existe' 
        },
        { status: 404 }
      );
    }
    
    const currentLog = logResult[0];
    console.log('Registro encontrado - Entregadas:', currentLog.unitsDelivered, 'Vendidas:', currentLog.unitsSold);

    // =============================================================================
    // 2. Validar que units_sold no exceda units_delivered
    // =============================================================================
    if (data.units_sold > currentLog.unitsDelivered) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Las unidades vendidas no pueden exceder las unidades entregadas',
          details: {
            units_delivered: currentLog.unitsDelivered,
            units_sold_requested: data.units_sold,
          }
        },
        { status: 400 }
      );
    }

    // =============================================================================
    // 3. Determinar el nuevo estado de liquidacion
    // =============================================================================
    let newSettlementStatus = data.settlement_status || currentLog.settlementStatus;
    
    // Si se vendieron todas las unidades, marcar como reconciliado automaticamente
    if (data.units_sold === currentLog.unitsDelivered && !data.settlement_status) {
      newSettlementStatus = 'reconciled';
      console.log('Todas las unidades vendidas - Estado cambiado a reconciled');
    }

    // =============================================================================
    // 4. Actualizar el registro
    // =============================================================================
    const updateData: Partial<typeof consignationLogs.$inferInsert> = {
      unitsSold: data.units_sold,
      settlementStatus: newSettlementStatus,
    };
    
    // Si el estado cambia a reconciled o invoiced, registrar la fecha
    if (newSettlementStatus === 'reconciled' || newSettlementStatus === 'invoiced') {
      updateData.settledAt = new Date();
    }
    
    const [updatedLog] = await db.update(consignationLogs)
      .set(updateData)
      .where(eq(consignationLogs.id, data.log_id))
      .returning();
    
    console.log('Registro actualizado exitosamente');

    // =============================================================================
    // 5. Actualizar el stock actual de la cuenta
    // =============================================================================
    const accountResult = await db.select()
      .from(accounts)
      .where(eq(accounts.id, currentLog.accountId))
      .limit(1);
    
    if (accountResult[0]) {
      // units_sold es nullable en la tabla (default 0). Sin el ?? 0, un registro
      // con NULL convertiría la resta en NaN y dejaría el stock de la cuenta
      // corrupto sin que ninguna consulta fallara.
      const unitsDifference = data.units_sold - (currentLog.unitsSold ?? 0);
      const newStock = Math.max(0, (accountResult[0].currentConsignationStock || 0) - unitsDifference);
      
      await db.update(accounts)
        .set({ currentConsignationStock: newStock })
        .where(eq(accounts.id, currentLog.accountId));
      
      console.log('Stock actualizado:', accountResult[0].currentConsignationStock, '->', newStock);
    }

    // =============================================================================
    // 6. Calcular montos
    // =============================================================================
    const unitPrice = parseFloat(updatedLog.unitPrice || '0');
    const totalDeliveredAmount = updatedLog.unitsDelivered * unitPrice;
    const totalSoldAmount = (updatedLog.unitsSold ?? 0) * unitPrice;
    const pendingAmount = totalDeliveredAmount - totalSoldAmount;

    return NextResponse.json(
      { 
        success: true,
        message: 'Registro de consignacion actualizado exitosamente',
        data: {
          id: updatedLog.id,
          account_id: updatedLog.accountId,
          units_delivered: updatedLog.unitsDelivered,
          units_sold: updatedLog.unitsSold,
          units_pending: updatedLog.unitsDelivered - (updatedLog.unitsSold ?? 0),
          unit_price: unitPrice,
          total_delivered_amount: totalDeliveredAmount,
          total_sold_amount: totalSoldAmount,
          pending_amount: pendingAmount,
          settlement_status: updatedLog.settlementStatus,
          dispatched_at: updatedLog.dispatchedAt,
          settled_at: updatedLog.settledAt,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error en PATCH /api/consignation:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}