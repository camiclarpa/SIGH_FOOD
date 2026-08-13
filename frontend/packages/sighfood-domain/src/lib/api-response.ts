// =============================================================================
// SIGH_FOOD - Helper para Respuestas de API consistentes
// Descripcion: Funciones para formatear respuestas y manejar errores
// =============================================================================

import { NextResponse } from 'next/server';
import { AppError, ValidationError } from './errors';

/** Cuerpo JSON que devuelven los helpers de respuesta. */
type CuerpoDeRespuesta = Record<string, unknown>;

/**
 * Respuesta de exito estandar
 */
export function successResponse(data: unknown, message?: string, statusCode: number = 200) {
  const body: CuerpoDeRespuesta = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  return NextResponse.json(body, { status: statusCode });
}

/**
 * Respuesta de error estandar
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string = 'Error interno del servidor'
) {
  // Si es un AppError conocido, usar su informacion
  if (error instanceof AppError) {
    const body: CuerpoDeRespuesta = {
      success: false,
      error: error.message,
      code: error.code,
    };
    
    // Incluir detalles solo en errores de validacion
    if (error instanceof ValidationError && error.details) {
      body.details = error.details;
    }
    
    // Loguear errores no operacionales (5xx)
    if (!error.isOperational) {
      console.error(`[ERROR ${error.code}]`, error.message);
    }
    
    return NextResponse.json(body, { status: error.statusCode });
  }

  // Si es un error de Zod (validacion)
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: unknown[] };
    return NextResponse.json(
      {
        success: false,
        error: 'Datos invalidos',
        code: 'VALIDATION_ERROR',
        details: zodError.issues,
      },
      { status: 400 }
    );
  }

  // Error desconocido - no exponer detalles en produccion
  console.error('[ERROR DESCONOCIDO]', error);

  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrapper para manejar errores en handlers de API
 * Uso:
 *   export const GET = handleApiError(async (request) => {
 *     // tu codigo aqui
 *     return successResponse(data);
 *   });
 */
export function handleApiError<TContext = unknown>(
  handler: (request: Request, context?: TContext) => Promise<NextResponse>
) {
  return async (request: Request, context?: TContext): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Validador helper para schemas de Zod
 */
export function validateBody<T>(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      error?: { issues: unknown[] };
      data?: T;
    };
  },
  body: unknown
) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Datos invalidos', result.error?.issues);
  }
  return result.data as T;
}