/**
 * Tests unitarios para HardwareDetector
 * RFC-001: System Architecture & Topology - Capa Cliente
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareDetector } from '../../src/client/hardware/HardwareDetector';

describe('HardwareDetector', () => {
  let detector: HardwareDetector;

  beforeEach(() => {
    detector = new HardwareDetector();
  });

  describe('getDeviceCapabilities()', () => {
    it('debería retornar capacidades del dispositivo', () => {
      const caps = detector.getDeviceCapabilities();
      
      expect(caps).toHaveProperty('cpuCores');
      expect(caps).toHaveProperty('memoryGB');
      expect(caps).toHaveProperty('hasWebGL');
      expect(caps).toHaveProperty('deviceType');
      expect(caps).toHaveProperty('performanceTier');
      expect(caps).toHaveProperty('isLowEnd');
      expect(caps).toHaveProperty('canHandleVideo');
      expect(caps).toHaveProperty('canHandleAnimations');
    });

    it('debería detectar tipo de dispositivo válido', () => {
      const caps = detector.getDeviceCapabilities();
      expect(['mobile', 'tablet', 'desktop', 'unknown']).toContain(caps.deviceType);
    });

    it('debería detectar performance tier válido', () => {
      const caps = detector.getDeviceCapabilities();
      expect(['low', 'medium', 'high']).toContain(caps.performanceTier);
    });
  });

  describe('canPlayHeroVideo()', () => {
    it('debería retornar un booleano', () => {
      const canPlay = detector.canPlayHeroVideo();
      expect(typeof canPlay).toBe('boolean');
    });
  });
});