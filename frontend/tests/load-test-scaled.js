import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// =============================================================================
// MÉTRICAS PERSONALIZADAS
// =============================================================================

// Métricas de rendimiento
const leadCreationTime = new Trend('lead_creation_time', true);
const statusCheckTime = new Trend('status_check_time', true);
const healthCheckTime = new Trend('health_check_time', true);

// Métricas de negocio
const leadsPerSecond = new Counter('leads_per_second');
const queueLength = new Trend('queue_length', true);

// Métricas de error
const errorRate = new Rate('errors');
const validationErrors = new Counter('validation_errors');
const serverErrors = new Counter('server_errors');

// Métricas de buffer/cola
const bufferUtilization = new Trend('buffer_utilization', true);
const dlqRate = new Rate('dlq_rate');

// =============================================================================
// CONFIGURACIÓN DE CARGA PROGRESIVA (10,000 usuarios)
// =============================================================================
export const options = {
  stages: [
    // Fase 1: Ramp-up inicial (0 → 1,000 usuarios en 2 minutos)
    { duration: '2m', target: 1000 },
    
    // Fase 2: Plateau moderado (1,000 usuarios por 3 minutos)
    { duration: '3m', target: 1000 },
    
    // Fase 3: Ramp-up intermedio (1,000 → 5,000 usuarios en 3 minutos)
    { duration: '3m', target: 5000 },
    
    // Fase 4: Plateau alto (5,000 usuarios por 3 minutos)
    { duration: '3m', target: 5000 },
    
    // Fase 5: Ramp-up máximo (5,000 → 10,000 usuarios en 2 minutos)
    { duration: '2m', target: 10000 },
    
    // Fase 6: Peak máximo (10,000 usuarios por 5 minutos)
    { duration: '5m', target: 10000 },
    
    // Fase 7: Ramp-down (10,000 → 0 en 2 minutos)
    { duration: '2m', target: 0 },
  ],
  
  // Thresholds (SLA - Service Level Agreements)
  thresholds: {
    // Latencia p95 debe ser < 50ms para Edge Functions
    'http_req_duration{p(95)}': ['<50'],
    
    // Menos del 1% de errores
    'http_req_failed': ['<0.01'],
    
    // Lead creation time p95 < 50ms
    'lead_creation_time': ['p(95)<50'],
    
    // Status check time p95 < 20ms
    'status_check_time': ['p(95)<20'],
    
    // Health check time p95 < 10ms
    'health_check_time': ['p(95)<10'],
    
    // Tasa de errores < 1%
    'errors': ['rate<0.01'],
    
    // DLQ rate < 0.1% (casi cero pérdidas)
    'dlq_rate': ['rate<0.001'],
  },
  
  // Configuración de escenarios
  scenarios: {
    // Escenario principal: Creación de leads
    createLeads: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '3m', target: 5000 },
        { duration: '3m', target: 5000 },
        { duration: '2m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    
    // Escenario secundario: Health checks periódicos
    healthChecks: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20m',
    },
    
    // Escenario terciario: Consultas de estado
    statusChecks: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 0 },
      ],
      startTime: '5m',
    },
  },
  
  // Tags para segmentación
  tags: {
    test_type: 'stress_test',
    max_users: '10000',
    environment: 'production',
  },
};

// =============================================================================
// DATOS DE PRUEBA
// =============================================================================
const testLeads = [
  {
    establishmentName: 'Gastrobar El Rincón',
    decisionMaker: 'Carlos Rodríguez',
    phone: '+573001234567',
    topLiquors: 'Gin, Mezcal, Ron Añejo',
    estimatedWeeklyVolume: 150,
  },
  {
    establishmentName: 'Rooftop Sky Lounge',
    decisionMaker: 'Ana Martínez',
    phone: '+573012345678',
    topLiquors: 'Whisky, Vodka, Gin Premium',
    estimatedWeeklyVolume: 300,
  },
  {
    establishmentName: 'Cervecería Artesanal',
    decisionMaker: 'Luis Gómez',
    phone: '+573023456789',
    topLiquors: 'Cerveza Artesanal, Gin',
    estimatedWeeklyVolume: 500,
  },
  {
    establishmentName: 'Bar Deportivo',
    decisionMaker: 'María López',
    phone: '+573034567890',
    topLiquors: 'Cerveza, Ron, Tequila',
    estimatedWeeklyVolume: 200,
  },
  {
    establishmentName: 'Restaurante Gourmet',
    decisionMaker: 'Pedro Sánchez',
    phone: '+573045678901',
    topLiquors: 'Vino, Whisky, Cognac',
    estimatedWeeklyVolume: 100,
  },
];

// =============================================================================
// FUNCIONES DE PRUEBA
// =============================================================================

/**
 * Crear un lead (POST /api/leads)
 */
function createLead(leadData) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
  };
  
  const response = http.post(`${__ENV.BASE_URL}/api/leads`, JSON.stringify(leadData), params);
  
  leadCreationTime.add(response.timings.duration);
  
  const checkResult = check(response, {
    'lead created (status 202)': (r) => r.status === 202,
    'has idempotency key': (r) => {
      try {
        return JSON.parse(r.body).idempotencyKey !== undefined;
      } catch {
        return false;
      }
    },
    'response time < 50ms': (r) => r.timings.duration < 50,
  });
  
  if (!checkResult) {
    errorRate.add(1);
    if (response.status >= 500) {
      serverErrors.add(1);
    } else if (response.status === 400) {
      validationErrors.add(1);
    }
  } else {
    leadsPerSecond.add(1);
  }
  
  return response;
}

/**
 * Consultar estado del lead (GET /api/leads/status)
 */
function checkLeadStatus(idempotencyKey) {
  if (!idempotencyKey) return null;
  
  const params = {
    headers: {
      'X-Request-ID': `status-${Date.now()}`,
    },
  };
  
  const response = http.get(
    `${__ENV.BASE_URL}/api/leads/status?idempotencyKey=${idempotencyKey}`,
    params
  );
  
  statusCheckTime.add(response.timings.duration);
  
  check(response, {
    'status checked (200 or 404)': (r) => r.status === 200 || r.status === 404,
    'status response time < 20ms': (r) => r.timings.duration < 20,
  });
  
  return response;
}

/**
 * Health check (GET /health)
 */
function healthCheck() {
  const params = {
    headers: {
      'X-Request-ID': `health-${Date.now()}`,
    },
  };
  
  const response = http.get(`${__ENV.BASE_URL}/health`, params);
  
  healthCheckTime.add(response.timings.duration);
  
  check(response, {
    'health ok (status 200)': (r) => r.status === 200,
    'health response time < 10ms': (r) => r.timings.duration < 10,
  });
  
  return response;
}

/**
 * Consultar longitud de cola (simulado)
 */
function checkQueueLength() {
  // En una implementación real, esto consultaría Redis
  // Aquí simulamos con un valor aleatorio para demostración
  const simulatedLength = Math.floor(Math.random() * 100);
  queueLength.add(simulatedLength);
  bufferUtilization.add(simulatedLength / 10000); // Normalizado a 10,000
}

// =============================================================================
// FUNCIONES PRINCIPALES
// =============================================================================

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Seleccionar un lead aleatorio del pool
  const leadIndex = Math.floor(Math.random() * testLeads.length);
  const leadData = testLeads[leadIndex];
  
  // Crear lead
  const createResponse = createLead(leadData);
  
  // Extraer idempotencyKey si existe
  let idempotencyKey = null;
  try {
    const body = JSON.parse(createResponse.body);
    idempotencyKey = body.idempotencyKey;
  } catch (e) {
    // Ignorar error de parsing
  }
  
  // Consultar estado (50% de probabilidad)
  if (idempotencyKey && Math.random() > 0.5) {
    sleep(0.5); // Pequeña pausa antes de consultar
    checkLeadStatus(idempotencyKey);
  }
  
  // Verificar cola cada 10 iteraciones
  if (__VU % 10 === 0) {
    checkQueueLength();
  }
  
  // Sleep aleatorio entre 1-3 segundos (simula comportamiento humano)
  sleep(Math.random() * 2 + 1);
}

/**
 * Función para health checks periódicos (escenario separado)
 */
export function healthCheckScenario() {
  healthCheck();
  sleep(10); // Health check cada 10 segundos
}

/**
 * Función para status checks (escenario separado)
 */
export function statusCheckScenario() {
  // Generar un ID aleatorio para consultar
  const randomId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  checkLeadStatus(randomId);
  sleep(2);
}