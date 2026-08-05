/**
 * Tests unitarios para ConnectionDetector
 * RFC-001: System Architecture & Topology - Capa Cliente
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionDetector } from '../../src/client/connection/ConnectionDetector';

describe('ConnectionDetector', () => {
  let detector: ConnectionDetector;

  beforeEach(() => {
    detector = new ConnectionDetector();
  });

  describe('getConnectionInfo()', () => {
    it('debería retornar información de conexión válida', () => {
      const info = detector.getConnectionInfo();
      
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('effectiveType');
      expect(info).toHaveProperty('downlink');
      expect(info).toHaveProperty('rtt');
      expect(info).toHaveProperty('saveData');
    });

    it('debería manejar navegadores sin Network Information API', () => {
      // Simular entorno sin API
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });

      const detectorNoAPI = new ConnectionDetector();
      const info = detectorNoAPI.getConnectionInfo();

      expect(info.type).toBe('unknown');
      expect(info.saveData).toBe(false);

      // Restaurar
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe('getAdaptiveStrategy()', () => {
    it('debería retornar una estrategia válida', () => {
      const strategy = detector.getAdaptiveStrategy();
      expect(['video', 'static-image', 'minimal']).toContain(strategy);
    });
  });

  describe('canLoadVideo()', () => {
    it('debería retornar un booleano', () => {
      const canLoad = detector.canLoadVideo();
      expect(typeof canLoad).toBe('boolean');
    });
  });
});