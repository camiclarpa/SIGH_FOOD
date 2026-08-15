// =============================================================================
// SIGH_FOOD - Endpoint de Escaneo QR para Comensales
// Endpoint: POST /api/moments/scan
// Descripción: Registra momentos sensoriales y consentimiento de comensales
// Tiempo objetivo: <3 segundos
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { z } from 'zod';
import { qrCodes, sensoryMoments, dataConsents, b2cConsumers } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';

// =============================================================================
// Schema de validación con Zod
// =============================================================================

const momentScanSchema = z.object({
  qr_token: z.string().min(1, 'El token QR es requerido'),
  whatsapp: z.string().min(8, 'El WhatsApp es requerido'),
  full_name: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  product_line: z.enum([
    'flavor_switch',
    'taste_shock',
    'spicy_volcano',
    'umami_boost',
    'sweet_craft'
  ], 'Línea de producto inválida'),
  sensory_profile: z.array(z.string()).optional(),
  habeas_data: z.boolean().refine(val => val === true, 'Debe aceptar el tratamiento de datos'),
  device_info: z.object({
    userAgent: z.string().optional(),
    platform: z.string().optional(),
  }).optional(),
});

// =============================================================================
// POST Handler - Registrar momento sensorial
// =============================================================================

export const POST = conTrazas('/api/moments/scan', async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {

    // Obtener y validar el body
    const body = await request.json();
    
    const validationResult = momentScanSchema.safeParse(body);
    
    if (!validationResult.success) {
      log.warn('Validación fallida', { ruta: '/api/moments/scan', issues: validationResult.error.issues });
      
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

    // Obtener conexión a la base de datos
    // El cuerpo va dentro de conBaseDeDatos para que la conexión se cierre
    // al terminar la petición: en Workers, dejarla abierta cuelga la respuesta.
    return await conBaseDeDatos(async (db) => {

    // =============================================================================
    // 1. Validar QR Token
    // =============================================================================
    log.debug('Validando QR token...', { ruta: '/api/moments/scan' });
    
    const qrResult = await db.select()
      .from(qrCodes)
      .where(eq(qrCodes.qrToken, data.qr_token))
      .limit(1);
    
    if (!qrResult[0] || !qrResult[0].isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'QR inválido o inactivo' 
        },
        { status: 400 }
      );
    }
    
    const qrCode = qrResult[0];
    log.debug('QR válido - Restaurante', { ruta: '/api/moments/scan', detalle: [qrCode.accountId, 'Mesa:', qrCode.tableNumber] });

    // =============================================================================
    // 2. Buscar o crear comensal
    // =============================================================================
    log.debug('Buscando comensal...', { ruta: '/api/moments/scan' });
    
    const existingConsumer = await db.select()
      .from(b2cConsumers)
      .where(eq(b2cConsumers.whatsappPhone, data.whatsapp))
      .limit(1);
    
    let consumerId: string;
    
    if (existingConsumer[0]) {
      consumerId = existingConsumer[0].id;
      log.debug('Comensal existente', { ruta: '/api/moments/scan', detalle: consumerId });
      
      // Actualizar preferencias si hay nuevo perfil sensorial
      if (data.sensory_profile && data.sensory_profile.length > 0) {
        const currentPreferences = existingConsumer[0].flavorPreference || {};
        const updatedPreferences = {
          ...currentPreferences,
          [data.product_line]: (currentPreferences[data.product_line] || 0) + 1,
        };
        
        await db.update(b2cConsumers)
          .set({ flavorPreference: updatedPreferences })
          .where(eq(b2cConsumers.id, consumerId));
        
        log.debug('Preferencias actualizadas', { ruta: '/api/moments/scan' });
      }
    } else {
      // Crear nuevo comensal
      log.debug('Creando nuevo comensal...', { ruta: '/api/moments/scan' });
      
      const [newConsumer] = await db.insert(b2cConsumers).values({
        whatsappPhone: data.whatsapp,
        fullName: data.full_name,
        email: data.email,
        flavorPreference: data.sensory_profile ? { [data.product_line]: 1 } : {},
        isVipWhatsapp: true,
      }).returning();
      
      consumerId = newConsumer.id;
      log.debug('Nuevo comensal creado', { ruta: '/api/moments/scan', detalle: consumerId });
    }

    // =============================================================================
    // 3. Registrar momento sensorial y consentimiento (transacción)
    // =============================================================================
    log.debug('Registrando momento sensorial y consentimiento...', { ruta: '/api/moments/scan' });
    
    await db.transaction(async (tx) => {
      // Insertar momento sensorial
      await tx.insert(sensoryMoments).values({
        accountId: qrCode.accountId,
        consumerId: consumerId,
        productLine: data.product_line,
        scannedAt: new Date(),
        deviceInfo: data.device_info || {
          // headers.get() devuelve null cuando falta; el campo es opcional.
          userAgent: request.headers.get('user-agent') ?? undefined,
          platform: 'web',
        },
      });
      
      // Insertar consentimiento
      await tx.insert(dataConsents).values({
        consumerId: consumerId,
        consentType: 'sensory_data',
        ipAddress: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        grantedAt: new Date(),
      });
    });
    
    log.debug('Momento sensorial y consentimiento registrados', { ruta: '/api/moments/scan' });

    // =============================================================================
    // 4. Calcular tiempo de ejecución y retornar respuesta
    // =============================================================================
    const executionTime = Date.now() - startTime;
    
    log.debug('Escaneo completado en', { ruta: '/api/moments/scan', detalle: [executionTime, 'ms'] });
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Momento sensorial registrado exitosamente',
        execution_time_ms: executionTime,
        data: {
          consumer_id: consumerId,
          account_id: qrCode.accountId,
          table_number: qrCode.tableNumber,
          product_line: data.product_line,
        }
      },
      { status: 200 }
    );

    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    log.error('Error en POST /api/moments/scan', error, { ruta: '/api/moments/scan' });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido',
        execution_time_ms: executionTime,
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// GET Handler - Health check
// =============================================================================

export const GET = conTrazas('/api/moments/scan', async () => {
  return NextResponse.json(
    { 
      status: 'ok',
      endpoint: '/api/moments/scan',
      description: 'Endpoint para registro de momentos sensoriales vía QR',
      method: 'POST',
      target_time_ms: 3000,
    },
    { status: 200 }
  );
});