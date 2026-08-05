/**
 * ============================================================================
 * RETRY STRATEGY - Estrategia de Reintentos con Backoff Exponencial
 * RFC-001: Capa Backend (Sección 3.3)
 * =============================================================================
 * 
 * FUNCIÓN: Implementar lógica de reintentos con backoff exponencial para
 * el Worker Consumidor.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.3: "Worker Consumidor — Procesa la cola de forma asíncrona,
 *   con lógica de reintentos exponenciales"
 * 
 * REFERENCIA RFC-DDIA:
 *   Sección 7.2: "Falla parcial — una escritura tiene éxito y la otra falla,
 *   sin ningún mecanismo que garantice que ambas se completen juntas"
 * 
 * SECUENCIA DE REINTENTOS:
 *   - Intento 1: inmediato
 *   - Intento 2: 2 segundos
 *   - Intento 3: 8 segundos
 *   - Intento 4: 30 segundos
 *   - Después de 4 intentos: mover a DLQ
 * 
 * JUSTIFICACIÓN (RFC-DDIA):
 *   El backoff exponencial evita saturar el CRM cuando está degradado,
 *   dando tiempo suficiente para que se recupere antes del siguiente intento.
 * ============================================================================
 */

export interface RetryConfig {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 4,
  initialDelayMs: 0, // Primer intento inmediato
  maxDelayMs: 30000, // Máximo 30 segundos
  backoffMultiplier: 4, // 0s → 2s → 8s → 30s
};

export class RetryStrategy {
  private config: RetryConfig;

  constructor(config: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.config = config;
  }

  /**
   * Calcula el delay para un intento específico.
   * 
   * Fórmula: min(initialDelay * multiplier^attempt, maxDelay)
   * 
   * @param attempt - Número de intento (0-indexed)
   * @returns Delay en milisegundos
   */
  getDelayForAttempt(attempt: number): number {
    if (attempt === 0) {
      return this.config.initialDelayMs;
    }

    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Verifica si se deben realizar más reintentos.
   * 
   * @param currentAttempt - Intento actual (0-indexed)
   * @returns true si hay más intentos disponibles
   */
  shouldRetry(currentAttempt: number): boolean {
    return currentAttempt < this.config.maxRetries;
  }

  /**
   * Ejecuta una operación con reintentos.
   * 
   * @param operation - Función asíncrona a ejecutar
   * @param onError - Callback opcional para cada fallo
   * @returns Resultado de la operación
   * @throws Error si todos los reintentos fallan
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (onError) {
          onError(lastError, attempt);
        }

        // Si es el último intento, no esperar
        if (attempt < this.config.maxRetries) {
          const delay = this.getDelayForAttempt(attempt);
          if (delay > 0) {
            await this.sleep(delay);
          }
        }
      }
    }

    throw lastError || new Error('Operación falló después de múltiples reintentos');
  }

  /**
   * Helper para esperar un tiempo específico.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportar instancia singleton
export const retryStrategy = new RetryStrategy();