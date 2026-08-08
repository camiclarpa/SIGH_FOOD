/**
 * ============================================================================
 * LOAD TEST - k6 Script para Verificación de Escalabilidad
 * RFC-001: Sección 5 (Consideraciones de Rendimiento y Escalabilidad)
 * ============================================================================
 * 
 * OBJETIVO: Simular pico de campaña (10,000+ usuarios concurrentes) y
 * verificar que el sistema no degrade la latencia percibida.
 * 
 * REFERENCIA RFC-001:
 *   Sección 5: "Escalabilidad ante picos de campaña (10,000+ usuarios
 *   concurrentes) — Sin degradación de latencia percibida"
 * 
 * EJECUCIÓN:
 *   k6 run tests/load/lead-capture-load.js
 *   k6 run tests/load/lead-capture-load.js --vus 10000 --duration 60s
 * ============================================================================
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métricas personalizadas
const formSubmissionSuccessRate = new Rate('form_submission_success');
const formSubmissionLatency = new Rate('form_submission_under_50ms');

// Configuración de escenarios
export const options = {
  scenarios: {
    // Escenario 1: Carga normal (100 usuarios concurrentes)
    normal_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      startTime: '0s',
    },
    // Escenario 2: Pico de campaña (1000 usuarios concurrentes)
    campaign_peak: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '10s', target: 1000 },
        { duration: '30s', target: 1000 },
        { duration: '10s', target: 0 },
      ],
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    form_submission_success: ['rate>0.99'],
    form_submission_under_50ms: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function escenarioDeCarga() {
  // Test 1: GET / - Landing SSG
  const landingResponse = http.get(BASE_URL + '/');
  
  check(landingResponse, {
    'landing status is 200': (r) => r.status === 200,
    'landing TTFB < 100ms': (r) => r.timings.waiting < 100,
    'landing contains SIGH_FOOD': (r) => r.body.includes('SIGH_FOOD'),
  });

  sleep(1);

  // Test 2: POST /api/leads - Formulario
  const payload = JSON.stringify({
    establecimiento: 'Gastrobar Test ' + __VU + '-' + __ITER,
    whatsapp: '+57300' + Math.floor(Math.random() * 10000000),
    ciudad: 'Medellín',
    licoresDominantes: ['Mezcal', 'Gin'],
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const formResponse = http.post(BASE_URL + '/api/leads', payload, params);
  
  const success = check(formResponse, {
    'form status is 202': (r) => r.status === 202,
    'form latency < 50ms': (r) => r.timings.waiting < 50,
  });

  formSubmissionSuccessRate.add(success);
  formSubmissionLatency.add(formResponse.timings.waiting < 50);

  sleep(2);

  // Test 3: GET /gracias - Página de confirmación
  const graciasResponse = http.get(BASE_URL + '/gracias');
  
  check(graciasResponse, {
    'gracias status is 200': (r) => r.status === 200,
    'gracias contains confirmación': (r) => r.body.includes('Solicitud recibida'),
  });
}