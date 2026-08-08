import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export function validateSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error.issues.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ),
    };
  }
}

export function createErrorResponse(
  message: string,
  requestId?: string,
  statusCode: number = 400
) {
  return {
    success: false,
    error: message,
    metadata: {
      requestId: requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      statusCode,
    },
  };
}

export async function validateAndProcess<T, R>(
  schema: z.ZodType<T>,
  data: unknown,
  processor: (validatedData: T) => Promise<R>
) {
  const validation = validateSchema(schema, data);
  
  if (!validation.success) {
    return createErrorResponse(
      `Validation failed: ${validation.errors?.join(', ')}`
    );
  }
  
  try {
    const result = await processor(validation.data!);
    return {
      success: true,
      data: result,
      metadata: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      500
    );
  }
}