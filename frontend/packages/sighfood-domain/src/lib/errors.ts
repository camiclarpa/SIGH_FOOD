// =============================================================================
// SIGH_FOOD - Clases de Error Personalizadas
// Descripcion: Jerarquia de errores para manejo consistente en toda la app
// =============================================================================

/**
 * Error base de la aplicacion
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational: boolean = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    
    // Mantener el stack trace correcto
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error de validacion de datos (400 Bad Request)
 */
export class ValidationError extends AppError {
  /** Normalmente el array `issues` de Zod, pero no se ata a esa forma. */
  public details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Error de recurso no encontrado (404 Not Found)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} no encontrado: ${identifier}`
      : `${resource} no encontrado`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Error de conflicto (409 Conflict)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Error de autorizacion (401 Unauthorized)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error de permisos (403 Forbidden)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Error de base de datos (500 Internal Server Error)
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Error en la base de datos') {
    super(message, 500, 'DATABASE_ERROR', false);
    this.name = 'DatabaseError';
  }
}

/**
 * Error de servicio externo (502 Bad Gateway)
 */
export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message?: string) {
    const msg = message || `Error en el servicio externo: ${service}`;
    super(msg, 502, 'EXTERNAL_SERVICE_ERROR', false);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Error de rate limit (429 Too Many Requests)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes. Intenta de nuevo mas tarde.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}