import { z } from 'zod';

// Schema base para requests
export const BaseRequestSchema = z.object({
  timestamp: z.string().datetime().optional(),
  requestId: z.string().uuid().optional(),
});

// Schema para usuario
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema para crear usuario
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8),
});

// Schema para actualizar usuario
export const UpdateUserSchema = CreateUserSchema.partial();

// Schema para respuesta de API
export const ApiResponseSchema = <T>(dataSchema: z.ZodType<T>) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    metadata: z.object({
      requestId: z.string().uuid(),
      timestamp: z.string().datetime(),
    }).optional(),
  });

// Schema para paginación
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Schema para health check
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number(),
  dependencies: z.record(
    z.object({
      status: z.enum(['up', 'down']),
      responseTime: z.number().optional(),
    })
  ),
});

// Tipos exportados
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
