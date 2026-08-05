import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const leadCreationTime = new Trend('lead_creation_time', true);
const statusCheckTime = new Trend('status_check_time', true);
const errorRate = new Rate('errors');

// Configuración de carga
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up: 10 usuarios en 30s
    { duration: '1m', target: 50 },   // Pico: 50 usuarios concurrentes
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // Criterios de éxito (SLA)
    'http_req_duration{p(95)}': ['<50'],       // 95% de las peticiones < 50ms
    'http_req_failed': ['<0.01'],              // Menos del 1% de errores
    'lead_creation_time': ['p(95)<50'],        // Creación de lead < 50ms
    'status_check_time': ['p(95)<20'],         // Consulta de estado < 20ms
  },
};

// Datos de prueba
const testLead = {
  establishmentName: 'Load Test Bar',
  decisionMaker: 'K6 Bot',
  phone: '+573001234567',
  topLiquors: 'Gin, Vodka',
  estimatedWeeklyVolume: 100,
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // 1. Crear un lead (POST /api/leads)
  const createRes = http.post(`${baseUrl}/api/leads`, JSON.stringify(testLead), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  leadCreationTime.add(createRes.timings.duration);
  
  const createCheck = check(createRes, {
    'lead created (status 202)': (r) => r.status === 202,
    'has idempotency key': (r) => {
      try {
        return JSON.parse(r.body).idempotencyKey !== undefined;
      } catch { return false; }
    },
  });
  
  errorRate.add(!createCheck);
  
  if (createCheck) {
    const idempotencyKey = JSON.parse(createRes.body).idempotencyKey;
    
    // 2. Consultar estado (GET /api/leads/status)
    const statusRes = http.get(`${baseUrl}/api/leads/status?idempotencyKey=${idempotencyKey}`);
    statusCheckTime.add(statusRes.timings.duration);
    
    check(statusRes, {
      'status checked (status 200 or 404)': (r) => r.status === 200 || r.status === 404,
    });
  }
  
  // Pausa entre iteraciones (simula comportamiento humano)
  sleep(Math.random() * 2 + 1);
}