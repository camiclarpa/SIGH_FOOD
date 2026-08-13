// =============================================================================
// SIGH_FOOD - B2B Lead Endpoint
// Endpoint: POST /api/leads/b2b
// Descripción: Captura leads desde la landing page B2B y los guarda en la BD
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { accounts } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

// =============================================================================
// Schema de validación con Zod
// =============================================================================

const b2bLeadSchema = z.object({
  name: z.string().min(2, 'El nombre del restaurante es requerido'),
  commercialName: z.string().optional(),
  zone: z.string().min(2, 'La zona es requerida'),
  address: z.string().min(5, 'La dirección es requerida'),
  decisionMakerName: z.string().min(2, 'El nombre del tomador de decisiones es requerido'),
  decisionMakerRole: z.enum([
    'Dueño',
    'Gerente A&B',
    'Head Bartender'
  ]).optional(),
  phone: z.string().min(8, 'El teléfono es requerido'),
  email: z.string().email('El email debe ser válido'),
  whatsapp: z.string().optional(),
  licoresDominantes: z.array(z.string()).optional(),
});

// =============================================================================
// POST Handler - Crear nuevo lead B2B
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Obtener y validar el body
    const body = await request.json();

    const validationResult = b2bLeadSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('❌ Validación fallida:', validationResult.error.issues);

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

    // Insertar el lead en la tabla accounts
    console.log('Insertando lead en la base de datos...');

    const newAccount = await conBaseDeDatos(async (db) => {
      const [fila] = await db.insert(accounts).values({
        name: data.name,
        commercialName: data.commercialName,
        zone: data.zone,
        address: data.address,
        decisionMakerName: data.decisionMakerName,
        decisionMakerRole: data.decisionMakerRole,
        phone: data.phone,
        email: data.email,
        pipelineStage: 'lemon_test_pending', // Estado inicial: Prueba del Limón pendiente
        currentConsignationStock: 0,
      }).returning();
      return fila;
    });

    console.log('✅ Lead insertado exitosamente:', newAccount.id);

    // Retornar respuesta de éxito
    return NextResponse.json(
      {
        success: true,
        message: 'Lead creado exitosamente',
        account: {
          id: newAccount.id,
          name: newAccount.name,
          email: newAccount.email,
          pipelineStage: newAccount.pipelineStage,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Error en POST /api/leads/b2b:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Health check (opcional)
// =============================================================================

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      endpoint: '/api/leads/b2b',
      description: 'Endpoint para captura de leads B2B',
      method: 'POST'
    },
    { status: 200 }
  );
}
