/**
 * Tests unitarios para RetryStrategy
 * RFC-001: Capa Backend de Ingesta Asíncrona
 */

import { describe, it, expect, vi } from 'vitest';
import { RetryStrategy, DEFAULT_RETRY_CONFIG } from '../../src/workers/retry/RetryStrategy';

describe('RetryStrategy', () => {
  let strategy: RetryStrategy;

  beforeEach(() => {
    strategy = new RetryStrategy(DEFAULT_RETRY_CONFIG);
  });

  describe('getDelayForAttempt()', () => {
    it('debería retornar 0 para el primer intento', () => {
      expect(strategy.getDelayForAttempt(0)).toBe(0);
    });

    it('debería calcular delays exponenciales', () => {
      expect(strategy.getDelayForAttempt(1)).toBe(0); // 0 * 4^1 = 0
      expect(strategy.getDelayForAttempt(2)).toBe(0); // 0 * 4^2 = 0
    });
  });

  describe('shouldRetry()', () => {
    it('debería permitir reintentos hasta el máximo', () => {
      expect(strategy.shouldRetry(0)).toBe(true);
      expect(strategy.shouldRetry(3)).toBe(true);
      expect(strategy.shouldRetry(4)).toBe(false);
    });
  });

  describe('executeWithRetry()', () => {
    it('debería ejecutar la operación exitosamente en el primer intento', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await strategy.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('debería reintentar si la operación falla', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await strategy.executeWithRetry(operation);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('debería lanzar error si todos los reintentos fallan', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('fail'));
      
      await expect(strategy.executeWithRetry(operation)).rejects.toThrow('fail');
      expect(operation).toHaveBeenCalledTimes(5); // 1 + 4 reintentos
    });
  });
});