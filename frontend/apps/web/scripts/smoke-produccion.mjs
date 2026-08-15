/**
 * Pruebas de humo del CRM contra un despliegue real (Tarea 4.5).
 *
 *   node scripts/smoke-produccion.mjs [url] [email] [password]
 *
 * Por defecto apunta al Worker de producción. Ejecuta el flujo completo —crear
 * cuenta, generar QR, registrar entrega, liquidar, escanear y leer métricas—
 * midiendo cada llamada contra el SLA de 3 segundos del RFC.
 *
 * Sale con código 1 si algo falla, para poder encadenarlo en CI.
 */

const BASE = process.argv[2] || 'https://sighbocazo-crm.camiloriverac0.workers.dev';
const EMAIL = process.argv[3] || 'admin@sighfood.co';
const PASSWORD = process.argv[4] || process.env.CRM_ADMIN_PASSWORD || 'CambiaEstaClave2026!';

const SLA_MS = 3000;
const sello = Date.now().toString().slice(-6);
const resultados = [];
let cookies = '';

function guardarCookies(respuesta) {
  const recibidas = respuesta.headers.getSetCookie?.() ?? [];
  for (const c of recibidas) {
    const par = c.split(';')[0];
    const nombre = par.split('=')[0];
    const otras = cookies.split('; ').filter((x) => x && !x.startsWith(`${nombre}=`));
    cookies = [...otras, par].join('; ');
  }
}

async function llamar(nombre, ruta, opciones = {}, esperado = 200) {
  const inicio = Date.now();
  let respuesta;
  let cuerpo = null;

  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      ...opciones,
      redirect: 'manual',
      headers: { ...(opciones.headers || {}), ...(cookies ? { cookie: cookies } : {}) },
    });
    guardarCookies(respuesta);
    const texto = await respuesta.text();
    try { cuerpo = JSON.parse(texto); } catch { cuerpo = texto.slice(0, 120); }
  } catch (error) {
    resultados.push({ nombre, ok: false, ms: Date.now() - inicio, detalle: String(error) });
    return { ok: false, cuerpo: null };
  }

  const ms = Date.now() - inicio;
  const esperados = Array.isArray(esperado) ? esperado : [esperado];
  const ok = esperados.includes(respuesta.status);
  const dentroDelSla = ms < SLA_MS;

  resultados.push({
    nombre,
    ok: ok && dentroDelSla,
    ms,
    detalle: ok
      ? (dentroDelSla ? '' : `supera el SLA de ${SLA_MS} ms`)
      : `HTTP ${respuesta.status}, se esperaba ${esperados.join('/')}`,
  });

  return { ok, cuerpo, estado: respuesta.status };
}

// ---------------------------------------------------------------------------

console.log(`\nCRM en ${BASE}\n${'='.repeat(62)}`);

// --- Autenticación -----------------------------------------------------------
const csrf = await llamar('login: obtener CSRF', '/api/auth/csrf');
const token = csrf.cuerpo?.csrfToken;
if (!token) {
  console.error('No se pudo obtener el token CSRF; se aborta.');
  process.exit(1);
}

await llamar(
  'login: credenciales',
  '/api/auth/callback/credentials',
  {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken: token, email: EMAIL, password: PASSWORD, redirect: 'false' }),
  },
  [200, 302]
);

const haySesion = cookies.includes('session-token');
console.log(`  sesion iniciada: ${haySesion ? 'si' : 'NO'}\n`);

// --- 4.5.1  /api/leads/b2b (publico) ----------------------------------------
const lead = await llamar('4.5.1  POST /api/leads/b2b', '/api/leads/b2b', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    name: `Bar Smoke ${sello}`,
    commercialName: 'Smoke',
    zone: 'Centro',
    address: `Calle ${sello} #10-20, Medellin`,
    decisionMakerName: 'Tester Smoke',
    phone: `+5730045${sello}`,
    email: `smoke.${sello}@test.co`,
  }),
});
const accountId = lead.cuerpo?.account?.id;

await llamar('       validacion rechaza datos malos', '/api/leads/b2b', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'X' }),
}, 400);

// --- 4.5.2  /api/qr-codes ----------------------------------------------------
const qr = await llamar('4.5.2  POST /api/qr-codes', '/api/qr-codes', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ account_id: accountId, table_number: `M${sello}` }),
}, 201);
const qrToken = qr.cuerpo?.data?.qr_token;

await llamar('       GET /api/qr-codes', `/api/qr-codes?account_id=${accountId}`);

// --- 4.5.3  /api/consignation ------------------------------------------------
const entrega = await llamar('4.5.3  POST /api/consignation', '/api/consignation', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ account_id: accountId, units_delivered: 60, unit_price: 21000 }),
}, 201);
const logId = entrega.cuerpo?.data?.id;

await llamar('       GET  /api/consignation', `/api/consignation?account_id=${accountId}&limit=2`);

await llamar('       PATCH /api/consignation (vende 25)', '/api/consignation', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ log_id: logId, units_sold: 25 }),
});

// --- Escaneo QR (alimenta las metricas) --------------------------------------
if (qrToken) {
  await llamar('       POST /api/moments/scan', '/api/moments/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      qr_token: qrToken,
      whatsapp: `+5730099${sello}`,
      full_name: 'Comensal Smoke',
      product_line: 'spicy_volcano',
      sensory_profile: ['picante'],
      habeas_data: true,
    }),
  });
}

// --- 4.5.4  /api/metrics -----------------------------------------------------
const metricas = await llamar('4.5.4  GET /api/metrics', '/api/metrics');
await llamar('       GET /api/metrics?type=accounts', '/api/metrics?type=accounts');

// --- Proteccion --------------------------------------------------------------
const guardadas = cookies;
cookies = '';
await llamar('       /api/metrics sin sesion devuelve 401', '/api/metrics', {}, 401);
cookies = guardadas;

// ---------------------------------------------------------------------------
console.log(`${'='.repeat(62)}`);
let fallos = 0;
for (const r of resultados) {
  const marca = r.ok ? 'OK  ' : 'FALLO';
  if (!r.ok) fallos++;
  console.log(`  ${marca} ${String(r.ms).padStart(5)} ms  ${r.nombre}${r.detalle ? '  -> ' + r.detalle : ''}`);
}

const tiempos = resultados.map((r) => r.ms);
console.log(`${'='.repeat(62)}`);
console.log(`  llamadas: ${resultados.length}   fallos: ${fallos}`);
console.log(`  tiempo maximo: ${Math.max(...tiempos)} ms   (SLA ${SLA_MS} ms)`);
if (accountId) console.log(`  cuenta de prueba: ${accountId}`);
if (metricas.cuerpo?.north_star) {
  console.log(`  north star: ${JSON.stringify(metricas.cuerpo.north_star)}`);
}
console.log('');

process.exit(fallos === 0 ? 0 : 1);
