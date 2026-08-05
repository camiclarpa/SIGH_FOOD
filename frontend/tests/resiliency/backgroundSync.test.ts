/**
 * tests/resiliency/backgroundSync.test.ts
 *
 * Tests de detección de soporte y registro de Background Sync.
 * RFC-003 Sección 3.2.1
 *
 * Casos de prueba:
 *   - Caso feliz: navegador con soporte completo (Chrome/Edge)
 *   - Caso borde: Safari/iOS sin soporte de SyncManager (F6 del FMEA)
 *   - Caso borde: Service Worker no registrado
 *   - Caso borde: error al registrar el sync tag
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  soportaBackgroundSync,
  registrarReintentoEnSegundoPlano,
} from '../../src/lib/resiliency/backgroundSync';

describe('backgroundSync - Background Sync API', () => {
  describe('soportaBackgroundSync', () => {
    it('debería retornar true cuando hay soporte completo (Chrome/Edge)', () => {
      // Simular entorno con soporte completo
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: {} },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      expect(soportaBackgroundSync()).toBe(true);
    });

    it('debería retornar false cuando no hay Service Worker (Safari antiguo)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      expect(soportaBackgroundSync()).toBe(false);
    });

    it('debería retornar false cuando no hay SyncManager (Safari/iOS < 17.4)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: {} },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      expect(soportaBackgroundSync()).toBe(false);
    });

    it('debería retornar false cuando no hay ninguno de los dos', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      expect(soportaBackgroundSync()).toBe(false);
    });
  });

  describe('registrarReintentoEnSegundoPlano', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('debería retornar false inmediatamente si no hay soporte', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      const resultado = await registrarReintentoEnSegundoPlano('test-lead-id');
      expect(resultado).toBe(false);
    });

    it('debería retornar true cuando el registro es exitoso', async () => {
      const mockRegister = vi.fn().mockResolvedValue(undefined);
      const mockReady = Promise.resolve({
        sync: { register: mockRegister },
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          serviceWorker: { ready: mockReady },
        },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      const resultado = await registrarReintentoEnSegundoPlano('test-lead-id-123');

      expect(resultado).toBe(true);
      expect(mockRegister).toHaveBeenCalledWith('sync-lead-test-lead-id-123');
    });

    it('debería retornar false si el registro falla', async () => {
      const mockReady = Promise.resolve({
        sync: { register: vi.fn().mockRejectedValue(new Error('Registration failed')) },
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          serviceWorker: { ready: mockReady },
        },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      const resultado = await registrarReintentoEnSegundoPlano('test-lead-id');
      expect(resultado).toBe(false);
    });

    it('debería usar el formato de tag correcto: sync-lead-${leadId}', async () => {
      const mockRegister = vi.fn().mockResolvedValue(undefined);
      const mockReady = Promise.resolve({
        sync: { register: mockRegister },
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          serviceWorker: { ready: mockReady },
        },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      await registrarReintentoEnSegundoPlano('abc-123-def');

      expect(mockRegister).toHaveBeenCalledWith('sync-lead-abc-123-def');
    });
  });
});