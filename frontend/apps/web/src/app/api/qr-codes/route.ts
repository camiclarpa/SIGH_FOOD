// =============================================================================
// SIGH_FOOD - Endpoint de Gestión de QR Codes
// Endpoints: 
//   POST   /api/qr-codes          - Generar nuevo QR
//   GET    /api/qr-codes          - Listar QRs de una cuenta
//   PATCH  /api/qr-codes          - Activar/Desactivar QR
// Descripción: Gestión de códigos QR únicos por mesa/restaurante
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { z } from 'zod';
import { qrCodes, accounts } from '@sighfood/domain/db/schema';
import { eq, and } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { randomUUID } from 'crypto';

// =============================================================================
// Schemas de validación con Zod
// =============================================================================

const createQrSchema = z.object({
  account_id: z.string().uuid('El account_id debe ser un UUID válido'),
  table_number: z.string()
    .min(1, 'El número de mesa es requerido')
    .max(50, 'El número de mesa no puede exceder 50 caracteres'),
});

const listQrSchema = z.object({
  account_id: z.string().uuid('El account_id debe ser un UUID válido'),
});

const updateQrSchema = z.object({
  qr_id: z.string().uuid('El qr_id debe ser un UUID válido'),
  is_active: z.boolean(),
});

// =============================================================================
// POST Handler - Generar nuevo QR Code
// =============================================================================

export const POST = conTrazas('/api/qr-codes', async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = createQrSchema.safeParse(body);
    
    if (!validationResult.success) {
      log.warn('Validación fallida', { ruta: '/api/qr-codes', issues: validationResult.error.issues });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    // El cuerpo va dentro de conBaseDeDatos para que la conexión se cierre
    // al terminar la petición: en Workers, dejarla abierta cuelga la respuesta.
    return await conBaseDeDatos(async (db) => {

    // =============================================================================
    // 1. Validar que la cuenta exista
    // =============================================================================
    log.debug('Validando account_id', { ruta: '/api/qr-codes', detalle: data.account_id });
    
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
    
    log.debug('Cuenta válida', { ruta: '/api/qr-codes', detalle: accountResult[0].name });

    // =============================================================================
    // 2. Verificar que no exista un QR activo para esa mesa
    // =============================================================================
    log.debug('Verificando QR existente para mesa', { ruta: '/api/qr-codes', detalle: data.table_number });
    
    // and() de Drizzle, no el && de JavaScript: `a && b && c` evalúa a `c`
    // porque los objetos SQL son truthy, así que el WHERE se reducía a
    // `is_active = true` y encontraba el QR de CUALQUIER cuenta y mesa. En la
    // práctica, en cuanto existía un QR activo en el sistema ningún
    // restaurante podía crear otro: siempre respondía 409.
    const existingQr = await db.select()
      .from(qrCodes)
      .where(
        and(
          eq(qrCodes.accountId, data.account_id),
          eq(qrCodes.tableNumber, data.table_number),
          eq(qrCodes.isActive, true)
        )
      )
      .limit(1);
    
    if (existingQr[0]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ya existe un QR activo para esta mesa',
          existing_qr: {
            id: existingQr[0].id,
            table_number: existingQr[0].tableNumber,
            created_at: existingQr[0].createdAt,
          }
        },
        { status: 409 }
      );
    }

    // =============================================================================
    // 3. Generar token único y crear QR
    // =============================================================================
    log.debug('Generando token único...', { ruta: '/api/qr-codes' });
    
    const qrToken = randomUUID();
    log.debug('Token generado', { ruta: '/api/qr-codes', detalle: qrToken });
    
    const [newQr] = await db.insert(qrCodes).values({
      accountId: data.account_id,
      tableNumber: data.table_number,
      qrToken: qrToken,
      isActive: true,
    }).returning();
    
    log.debug('QR Code creado exitosamente', { ruta: '/api/qr-codes', detalle: newQr.id });

    // =============================================================================
    // 4. Construir URL de escaneo
    // =============================================================================
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const scanUrl = `${baseUrl}/scan?token=${qrToken}`;

    return NextResponse.json(
      { 
        success: true,
        message: 'QR Code generado exitosamente',
        data: {
          id: newQr.id,
          account_id: newQr.accountId,
          table_number: newQr.tableNumber,
          qr_token: newQr.qrToken,
          is_active: newQr.isActive,
          scan_url: scanUrl,
          created_at: newQr.createdAt,
        }
      },
      { status: 201 }
    );

    });

  } catch (error) {
    log.error('Error en POST /api/qr-codes', error, { ruta: '/api/qr-codes' });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET Handler - Listar QR Codes de una cuenta
// =============================================================================

export const GET = conTrazas('/api/qr-codes', async (request: NextRequest) => {
  try {
    
    // Obtener account_id de query params
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    
    if (!accountId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El parámetro account_id es requerido' 
        },
        { status: 400 }
      );
    }
    
    // Validar UUID
    const validationResult = listQrSchema.safeParse({ account_id: accountId });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'account_id inválido',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    // El cuerpo va dentro de conBaseDeDatos para que la conexión se cierre
    // al terminar la petición: en Workers, dejarla abierta cuelga la respuesta.
    return await conBaseDeDatos(async (db) => {

    // =============================================================================
    // 1. Validar que la cuenta exista
    // =============================================================================
    const accountResult = await db.select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
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
    // 2. Obtener todos los QRs de la cuenta
    // =============================================================================
    log.debug('Buscando QRs para account_id', { ruta: '/api/qr-codes', detalle: accountId });
    
    const qrList = await db.select()
      .from(qrCodes)
      .where(eq(qrCodes.accountId, accountId))
      .orderBy(qrCodes.createdAt);
    
    log.debug('QR codes encontrados', { ruta: '/api/qr-codes', total: qrList.length });

    // =============================================================================
    // 3. Construir URLs de escaneo
    // =============================================================================
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const qrListWithUrls = qrList.map(qr => ({
      id: qr.id,
      account_id: qr.accountId,
      table_number: qr.tableNumber,
      qr_token: qr.qrToken,
      is_active: qr.isActive,
      scan_url: `${baseUrl}/scan?token=${qr.qrToken}`,
      created_at: qr.createdAt,
    }));

    return NextResponse.json(
      { 
        success: true,
        message: `Se encontraron ${qrList.length} QR codes`,
        count: qrList.length,
        data: qrListWithUrls,
      },
      { status: 200 }
    );

    });

  } catch (error) {
    log.error('Error en GET /api/qr-codes', error, { ruta: '/api/qr-codes' });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// PATCH Handler - Activar/Desactivar QR Code
// =============================================================================

export const PATCH = conTrazas('/api/qr-codes', async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = updateQrSchema.safeParse(body);
    
    if (!validationResult.success) {
      log.warn('Validación fallida', { ruta: '/api/qr-codes', issues: validationResult.error.issues });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    // El cuerpo va dentro de conBaseDeDatos para que la conexión se cierre
    // al terminar la petición: en Workers, dejarla abierta cuelga la respuesta.
    return await conBaseDeDatos(async (db) => {

    // =============================================================================
    // 1. Verificar que el QR exista
    // =============================================================================
    log.debug('Buscando QR con id', { ruta: '/api/qr-codes', detalle: data.qr_id });
    
    const qrResult = await db.select()
      .from(qrCodes)
      .where(eq(qrCodes.id, data.qr_id))
      .limit(1);
    
    if (!qrResult[0]) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El QR Code especificado no existe' 
        },
        { status: 404 }
      );
    }
    
    const currentQr = qrResult[0];
    log.debug('QR encontrado - Mesa', { ruta: '/api/qr-codes', detalle: [currentQr.tableNumber, 'Activo:', currentQr.isActive] });

    // =============================================================================
    // 2. Actualizar estado
    // =============================================================================
    const [updatedQr] = await db.update(qrCodes)
      .set({ 
        isActive: data.is_active,
      })
      .where(eq(qrCodes.id, data.qr_id))
      .returning();
    
    log.debug('QR actualizado - Nuevo estado', { ruta: '/api/qr-codes', detalle: updatedQr.isActive });

    // =============================================================================
    // 3. Construir URL de escaneo
    // =============================================================================
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const scanUrl = `${baseUrl}/scan?token=${updatedQr.qrToken}`;

    return NextResponse.json(
      { 
        success: true,
        message: `QR Code ${data.is_active ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          id: updatedQr.id,
          account_id: updatedQr.accountId,
          table_number: updatedQr.tableNumber,
          qr_token: updatedQr.qrToken,
          is_active: updatedQr.isActive,
          scan_url: scanUrl,
          updated_at: new Date().toISOString(),
        }
      },
      { status: 200 }
    );

    });

  } catch (error) {
    log.error('Error en PATCH /api/qr-codes', error, { ruta: '/api/qr-codes' });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});