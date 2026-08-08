/**
 * ============================================================================
 * CIRCUIT BREAKER - Patrón de Resiliencia
 * RFC-001: Sección 6 (Estrategia de Fallos)
 * ============================================================================
 * 
 * FUNCIÓN: Prevenir llamadas repetidas a un servicio degradado (CRM),
 * dando tiempo para que se recupere antes de reintentar.
 * 
 * REFERENCIA RFC-001:
 *   Sección 6: "El CRM está caído o degradado — La cola retiene el evento
 *   indefinidamente hasta que el CRM se recupere"
 * 
 * ESTADOS DEL CIRCUIT BREAKER:
 *   - CLOSED: Operación normal, las llamadas pasan al CRM
 *   - OPEN: CRM degradado, las llamadas se rechazan inmediatamente
 *   - HALF-OPEN: Permite una llamada de prueba para verificar recuperación
 * 
 * TRANSICIONES:
 *   CLOSED → OPEN: Tras N fallos consecutivos (threshold)
 *   OPEN → HALF-OPEN: Tras timeout de espera
 *   HALF-OPEN → CLOSED: Si la llamada de prueba tiene éxito
 *   HALF-OPEN → OPEN: Si la llamada de prueba falla
 * ============================================================================
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

export interface CircuitBreakerConfig {
  readonly failureThreshold: number; // Fallos consecutivos para abrir circuito
  readonly recoveryTimeoutMs: number; // Tiempo en estado OPEN antes de HALF-OPEN
  readonly successThreshold: number; // Éxitos consecutivos en HALF-OPEN para cerrar
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000, // 1 minuto
  successThreshold: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {
    this.config = config;
  }

  /**
   * Ejecuta una operación protegida por el circuit breaker.
   * 
   * @param operation - Función asíncrona a ejecutar
   * @returns Resultado de la operación
   * @throws Error si el circuito está OPEN o la operación falla
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.checkState();

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Verifica el estado actual del circuito.
   */
  getState(): CircuitState {
    this.aplicarTransicionPorTiempo();
    return this.state;
  }

  /**
   * Verifica si el circuito permite llamadas.
   */
  isClosed(): boolean {
    this.aplicarTransicionPorTiempo();
    return this.state === 'CLOSED';
  }

  /**
   * Verifica si el circuito está abierto (rechazando llamadas).
   */
  isOpen(): boolean {
    this.aplicarTransicionPorTiempo();
    return this.state === 'OPEN';
  }

  /**
   * Verifica si el circuito está en estado HALF-OPEN (prueba de recuperación).
   */
  isHalfOpen(): boolean {
    this.aplicarTransicionPorTiempo();
    return this.state === 'HALF-OPEN';
  }

  /**
   * Fuerza el circuito a estado OPEN (útil para tests o mantenimiento).
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
  }

  /**
   * Fuerza el circuito a estado CLOSED (recuperación manual).
   */
  forceClose(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Obtiene estadísticas del circuit breaker.
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Verifica transiciones de estado basadas en el tiempo.
   */
  private checkState(): void {
    this.aplicarTransicionPorTiempo();

    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      throw new Error(`Circuit breaker is OPEN. Retry after ${Math.ceil((this.config.recoveryTimeoutMs - timeSinceLastFailure) / 1000)}s`);
    }
  }

  /**
   * Aplica la transición OPEN → HALF-OPEN cuando ya venció el tiempo de
   * recuperación. Idempotente y sin efectos si no toca cambiar.
   *
   * La consultan también los métodos de lectura: si solo transicionara dentro
   * de execute(), getState() seguiría diciendo 'OPEN' indefinidamente mientras
   * nadie llamara al circuito, y cualquier dashboard o health check que lo
   * observe estaría informando un estado que ya no es el real.
   */
  private aplicarTransicionPorTiempo(): void {
    if (this.state !== 'OPEN') {
      return;
    }

    if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
      this.state = 'HALF-OPEN';
      this.successCount = 0;
    }
  }

  /**
   * Maneja el éxito de una operación.
   */
  private onSuccess(): void {
    if (this.state === 'HALF-OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  /**
   * Maneja el fallo de una operación.
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF-OPEN') {
      this.state = 'OPEN';
    } else if (this.state === 'CLOSED' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// Exportar instancia singleton para el CRM
export const crmCircuitBreaker = new CircuitBreaker();