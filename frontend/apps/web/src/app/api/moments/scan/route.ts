// =============================================================================
// SIGH_FOOD - Endpoint de Escaneo QR para Comensales
// Endpoint: POST /api/moments/scan
// Descripción: Registra momentos sensoriales y consentimiento de comensales
// Tiempo objetivo: <3 segundos
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { z } from 'zod';
import { accounts, lotes, qrCodes, sensoryMoments, dataConsents, b2cConsumers } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { procesarEscaneo } from '@/lib/fidelizacion';
import { normalizarTelefono } from '@/lib/whatsapp/config';

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

  /*
    Dónde se consumió.

    Por defecto 'horeca' porque este endpoint nació para el QR de la mesa, y
    suponerlo mantiene funcionando a quien ya lo llama sin pasar el campo.

    Un pico a las seis de la tarde significa una cosa si es en un bar y otra si
    es en casa. Sin esta distinción los dos caían en la misma barra del gráfico.
  */
  canal: z.enum(['horeca', 'hogar', 'evento']).default('horeca'),

  /** Con qué lo está tomando. Una pregunta de un toque, justo tras escanear. */
  maridaje: z.enum(['cerveza', 'vino', 'cafe', 'solo']).optional(),

  /** Código del lote impreso en la bolsa, si lo tiene delante. */
  lote: z.string().max(40).optional(),

  /** Si lo enseñó a alguien. Es la base de la tasa de viralización. */
  compartido: z.boolean().optional(),
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

    /*
      La zona sale del BAR, no del móvil de la persona.

      Para saber en qué parte de la ciudad se activa la marca basta con el
      barrio, y el bar ya lo tiene registrado. Pedirle la ubicación exacta a
      quien escanea costaría un permiso que mucha gente niega —y una obligación
      de tratamiento de datos— a cambio de una precisión que nadie necesita para
      decidir dónde abrir el siguiente punto de venta.
    */
    const [bar] = qrCode.accountId
      ? await db
          .select({ zona: accounts.zone })
          .from(accounts)
          .where(eq(accounts.id, qrCode.accountId))
          .limit(1)
      : [];
    const zonaDelBar = bar?.zona ?? null;

    // =============================================================================
    // 2. Buscar o crear comensal
    // =============================================================================
    log.debug('Buscando comensal...', { ruta: '/api/moments/scan' });
    
    /*
      EL TELÉFONO SE NORMALIZA ANTES DE BUSCAR Y ANTES DE GUARDAR.

      Aquí se guardaba tal cual llegaba. El resultado fue una ficha duplicada de
      la misma persona: "+573162066856" creada por este endpoint y
      "573162066856" creada por la tienda, que sí normaliza. Dos fichas, los
      puntos repartidos entre ellas y el historial partido por la mitad.

      Y de cara al cliente era peor: la ficha que tenía sus puntos no era la que
      usaba su sesión en la tienda, así que veía cero.
    */
    const telefono = normalizarTelefono(data.whatsapp);
    if (!telefono) {
      return NextResponse.json(
        { ok: false, error: 'El teléfono no parece válido' },
        { status: 400 }
      );
    }

    const existingConsumer = await db.select()
      .from(b2cConsumers)
      .where(eq(b2cConsumers.whatsappPhone, telefono))
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
        whatsappPhone: telefono,
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
    
    const [momento] = await db.transaction(async (tx) => {
      // Insertar momento sensorial
      /*
        El lote, si lo escribió. Mismo criterio que en las reseñas: se normaliza
        a mayúsculas sin espacios, y un código que no existe NO invalida el
        momento — la persona escaneó de verdad, y perder el escaneo por una
        errata al copiar de una bolsa arrugada sería absurdo.
      */
      let loteId: string | null = null;
      if (data.lote?.trim()) {
        const codigo = data.lote.trim().toUpperCase().replace(/\s+/g, '');
        const [l] = await tx
          .select({ id: lotes.id })
          .from(lotes)
          .where(eq(lotes.codigo, codigo))
          .limit(1);
        loteId = l?.id ?? null;
      }

      const insertado = await tx.insert(sensoryMoments).values({
        accountId: qrCode.accountId,
        consumerId: consumerId,
        productLine: data.product_line,
        scannedAt: new Date(),
        canal: data.canal,
        maridaje: data.maridaje ?? null,
        // La zona ya se leyó del bar antes de la transacción (zonaDelBar):
        // qrCodes no tiene columna de zona propia, la tiene accounts.
        zona: zonaDelBar,
        loteId,
        compartido: data.compartido ?? false,
        deviceInfo: data.device_info || {
          // headers.get() devuelve null cuando falta; el campo es opcional.
          userAgent: request.headers.get('user-agent') ?? undefined,
          platform: 'web',
        },
      }).returning({ id: sensoryMoments.id });

      // Insertar consentimiento
      await tx.insert(dataConsents).values({
        consumerId: consumerId,
        consentType: 'sensory_data',
        ipAddress: request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        grantedAt: new Date(),
      });

      return insertado;
    });

    log.debug('Momento sensorial y consentimiento registrados', { ruta: '/api/moments/scan' });

    // =============================================================================
    // 4. Fidelización: puntos, insignias y nivel
    // =============================================================================
    //
    // Va FUERA de la transacción anterior y dentro de su propio try: el momento
    // sensorial ya está guardado y es el dato que no se puede perder. Si fallara
    // el cálculo de puntos, el comensal debe seguir viendo su escaneo aceptado
    // —los puntos se recuperan reevaluando; un momento perdido, no—.
    let recompensa = null;
    try {
      recompensa = await procesarEscaneo(db, { consumerId, momentId: momento.id });
      log.debug('Fidelización procesada', {
        ruta: '/api/moments/scan',
        detalle: [recompensa.puntosGanados, 'puntos', recompensa.insigniasNuevas.length, 'insignias'],
      });
    } catch (e) {
      log.error('No se pudo procesar la fidelización del escaneo', e, {
        ruta: '/api/moments/scan',
        detalle: consumerId,
      });
    }

    // =============================================================================
    // 5. Calcular tiempo de ejecución y retornar respuesta
    // =============================================================================
    const executionTime = Date.now() - startTime;

    log.debug('Escaneo completado en', { ruta: '/api/moments/scan', detalle: [executionTime, 'ms'] });

    return NextResponse.json(
      {
        success: true,
        message: 'Momento sensorial registrado exitosamente',
        execution_time_ms: executionTime,
        data: {
          moment_id: momento.id,
          consumer_id: consumerId,
          account_id: qrCode.accountId,
          table_number: qrCode.tableNumber,
          product_line: data.product_line,
          // Lo que la pantalla de la mesa necesita para celebrarlo al instante.
          puntos_ganados: recompensa?.puntosGanados ?? 0,
          insignias_nuevas: recompensa?.insigniasNuevas ?? [],
          nivel_nuevo: recompensa?.nivelNuevo ?? null,
          momentos_totales: recompensa?.escaneosTotales ?? null,
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
// PATCH — Añadir el maridaje o marcar que se compartió, tras el registro
// =============================================================================
//
// Va aparte del POST a propósito: el momento se registra al enviar el
// formulario, y esta pregunta —"¿con qué lo estás tomando?"— se hace DESPUÉS,
// sin bloquear la celebración de puntos. Un formulario que pidiera el maridaje
// antes de guardar perdería registros enteros por un dato secundario.
//
// NO acepta cambiar `product_line` ni el comensal: eso ya quedó fijado en el
// POST, y reabrirlo aquí permitiría reescribir de qué trató el momento después
// de que ya contara para puntos e insignias.

const patchSchema = z.object({
  moment_id: z.string().uuid(),
  maridaje: z.enum(['cerveza', 'vino', 'cafe', 'solo']).optional(),
  compartido: z.boolean().optional(),
});

export const PATCH = conTrazas('/api/moments/scan', async (request: NextRequest) => {
  const v = patchSchema.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json({ success: false, error: 'Datos no válidos' }, { status: 400 });
  }

  if (v.data.maridaje === undefined && v.data.compartido === undefined) {
    return NextResponse.json({ success: true });
  }

  try {
    await conBaseDeDatos((db) =>
      db
        .update(sensoryMoments)
        .set({
          ...(v.data.maridaje !== undefined ? { maridaje: v.data.maridaje } : {}),
          ...(v.data.compartido !== undefined ? { compartido: v.data.compartido } : {}),
        })
        .where(eq(sensoryMoments.id, v.data.moment_id))
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    log.error('No se pudo actualizar el momento', e, { ruta: '/api/moments/scan' });
    // Es información extra sobre un momento que ya se guardó. Que falle no
    // debe romper nada en la pantalla del comensal.
    return NextResponse.json({ success: true });
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