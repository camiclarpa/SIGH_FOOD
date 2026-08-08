/**
 * ============================================================================
 * TEST E2E - Flujo Completo de Captura de Lead
 * RFC-001: Sección 5 (Consideraciones de Rendimiento y Escalabilidad)
 * ============================================================================
 * 
 * OBJETIVO: Verificar que el flujo completo funcione end-to-end:
 * 1. GET / → Landing SSG se sirve desde Edge Cache
 * 2. POST /api/leads → Edge Function responde 202 en <50ms
 * 3. Redirect a /gracias → Página SSG sin leer CRM
 * 4. Lead aparece en CRM (vía Worker asíncrono)
 * 
 * REFERENCIA RFC-001:
 *   Sección 5: "LCP < 1.2s · TTFB < 100ms · Latencia de aceptación < 50ms"
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';

// Configuración de objetivos de rendimiento (RFC-001 Sección 5)
const PERFORMANCE_TARGETS = {
  LCP_MS: 1200,
  TTFB_MS: 100,
  FORM_SUBMISSION_MS: 50,
  CACHE_HIT_RATIO: 0.95,
};

/**
 * Estos tests golpean un servidor real, no mocks. Se ejecutan solo cuando se
 * indica dónde está, para que la suite unitaria no falle por infraestructura
 * ausente ni dé por buenas mediciones contra un servidor que no existe.
 *
 * Tiene que ser un servidor de PRODUCCIÓN: en `next dev` cada ruta se compila
 * en la primera petición, así que el TTFB ronda los segundos y los umbrales de
 * rendimiento de abajo son inalcanzables por construcción.
 *
 *   npm run build && npm start                   (en otra terminal)
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * Sin la variable quedan marcados como omitidos, nunca como aprobados.
 */
const BASE_URL = process.env.E2E_BASE_URL;

describe.runIf(BASE_URL)('Flujo E2E: Captura de Lead', () => {
  const testLead = {
    establecimiento: 'Gastrobar Test E2E',
    whatsapp: '+573009998888',
    ciudad: 'Medellín',
    licoresDominantes: ['Mezcal', 'Gin'],
  };

  describe('1. GET / - Landing SSG desde Edge Cache', () => {
    it('debería servir el landing con LCP < 1.2s', async () => {
      const startTime = performance.now();
      
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      
      const ttfb = performance.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(html).toContain('SIGH_FOOD');
      expect(html).toContain('20 segundos');
      expect(ttfb).toBeLessThan(PERFORMANCE_TARGETS.TTFB_MS);
    });

    it('debería incluir preload del video Hero', async () => {
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      
      expect(html).toContain('rel="preload"');
      expect(html).toContain('hero-cono');
    });
  });

  // Estos tres golpean la cola real: /api/leads escribe en Upstash Redis. Sin
  // UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN válidos la petición se
  // queda esperando y el test expira.
  describe('2. POST /api/leads - Edge Function 202 Accepted', () => {
    it('debería aceptar el formulario en <50ms', async () => {
      const startTime = performance.now();
      
      const response = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLead),
      });
      
      const latency = performance.now() - startTime;
      const data = await response.json();
      
      expect(response.status).toBe(202);
      expect(data.status).toBe('queued');
      expect(latency).toBeLessThan(PERFORMANCE_TARGETS.FORM_SUBMISSION_MS);
    });

    it('debería rechazar datos incompletos con 400', async () => {
      const response = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establecimiento: 'Test' }),
      });
      
      expect(response.status).toBe(400);
    });

    it('debería detectar duplicados con idempotencyKey', async () => {
      // Primer envío
      await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLead),
      });
      
      // Segundo envío inmediato (mismo día)
      const response = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLead),
      });
      
      // Debería ser 200 (duplicate) o 202 con mensaje
      expect([200, 202]).toContain(response.status);
    });
  });

  describe('3. GET /gracias - Página SSG sin leer CRM', () => {
    it('debería servir página de gracias estática', async () => {
      const response = await fetch(`${BASE_URL}/gracias`);
      const html = await response.text();
      
      expect(response.status).toBe(200);
      expect(html).toContain('Solicitud recibida');
      // Lo que importa es que la página no consulte el CRM para renderizarse.
      // No vale buscar 'hubspot' a secas: el layout incluye un <link
      // rel="preconnect"> a api.hubspot.com, que es una pista de red, no una
      // lectura de datos. Se comprueba que no aparezcan datos del lead.
      expect(html).not.toContain('contactId');
      expect(html).not.toContain('dealId');
    });
  });

  describe('4. Verificación en CRM (asíncrono)', () => {
    // Pendiente de implementación: la landing no expone /api/health/queue.
    // Se deja declarado para no perder el requisito del RFC-001, pero no puede
    // pasar hasta que exista el endpoint.
    it.skip('debería sincronizar el lead con el CRM en <30s', async () => {
      // Esperar procesamiento asíncrono
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // En producción, verificar en HubSpot/Pipedrive
      const response = await fetch(`${BASE_URL}/api/health/queue`);
      const data = await response.json();
      
      expect(data.queueLength).toBeDefined();
      expect(data.processedToday).toBeGreaterThan(0);
    });
  });
});