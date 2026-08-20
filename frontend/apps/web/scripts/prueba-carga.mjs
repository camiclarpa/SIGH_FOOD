// =============================================================================
// Prueba de carga del CRM
// =============================================================================
//
// Responde a una pregunta que hasta ahora se contestaba de oído: ¿aguanta 1000
// clientes? Se afirmaba que sí porque el modelo de datos y los índices lo
// permiten, pero el límite real no está en Postgres — está en cuántas
// conexiones simultáneas tolera Neon antes de empezar a rechazar.
//
// Uso:
//   node scripts/prueba-carga.mjs                    (contra producción)
//   BASE=http://localhost:3000 node scripts/prueba-carga.mjs
//   MAX=200 node scripts/prueba-carga.mjs            (techo de concurrencia)
//
// Sube la concurrencia por escalones y PARA en cuanto aparecen errores. Está
// pensada para encontrar el límite sin provocar la caída que intenta prevenir:
// un test de carga descuidado contra producción es, él mismo, una caída.

const BASE = process.env.BASE ?? 'https://sighbocazo-crm.camiloriverac0.workers.dev';
const MAX = Number(process.env.MAX ?? 120);
const EMAIL = process.env.QA_EMAIL;
const PASSWORD = process.env.QA_PASSWORD;

/** Escalones de concurrencia. Se corta en cuanto uno falla. */
const ESCALONES = [1, 5, 10, 20, 40, 60, 80, 100, 150, 200, 300].filter((n) => n <= MAX);

/** Si más de este porcentaje falla, se considera superado el límite. */
const UMBRAL_ERRORES = 2;

/** Si la mediana supera esto, el sistema ya no da un servicio aceptable. */
const UMBRAL_P50_MS = 3000;

let cookies = '';

function guardarCookies(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const par = c.split(';')[0];
    const nombre = par.split('=')[0];
    cookies = [...cookies.split('; ').filter((x) => x && x.split('=')[0] !== nombre), par].join('; ');
  }
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(BASE + ruta, {
    ...opciones,
    redirect: 'manual',
    headers: { cookie: cookies, ...(opciones.headers ?? {}) },
  });
  guardarCookies(res);
  return res;
}

async function entrar() {
  if (!EMAIL || !PASSWORD) return false;
  const { csrfToken } = await (await pedir('/api/auth/csrf')).json();
  await pedir('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, callbackUrl: `${BASE}/` }).toString(),
  });
  const sesion = await (await pedir('/api/auth/session')).json();
  return Boolean(sesion?.user);
}

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
}

/**
 * Lanza `n` peticiones a la vez y mide.
 *
 * Todas arrancan simultáneamente a propósito: escalonarlas mediría latencia,
 * no capacidad, y el límite de conexiones solo aparece con solapamiento real.
 */
async function escalon(ruta, n) {
  const inicio = Date.now();

  const resultados = await Promise.all(
    Array.from({ length: n }, async () => {
      const t0 = Date.now();
      try {
        const res = await pedir(ruta);
        // Se consume el cuerpo: sin ello la conexión queda a medias y el
        // siguiente escalón heredaría sockets sin liberar.
        await res.text();
        return { ms: Date.now() - t0, estado: res.status, ok: res.status === 200 };
      } catch (e) {
        return { ms: Date.now() - t0, estado: 0, ok: false, error: String(e).slice(0, 80) };
      }
    })
  );

  const duracion = Date.now() - inicio;
  const tiempos = resultados.map((r) => r.ms);
  const errores = resultados.filter((r) => !r.ok);
  const porEstado = {};
  for (const r of resultados) porEstado[r.estado] = (porEstado[r.estado] ?? 0) + 1;

  return {
    n,
    duracion,
    ok: resultados.length - errores.length,
    errores: errores.length,
    tasaError: (errores.length / resultados.length) * 100,
    p50: percentil(tiempos, 50),
    p95: percentil(tiempos, 95),
    max: Math.max(...tiempos),
    rps: Math.round((resultados.length / duracion) * 1000),
    porEstado,
    muestraError: errores[0]?.error ?? (errores[0] ? `HTTP ${errores[0].estado}` : undefined),
  };
}

// -----------------------------------------------------------------------------

console.log(`Objetivo: ${BASE}`);
console.log(`Escalones: ${ESCALONES.join(', ')} peticiones simultáneas\n`);

const autenticado = await entrar();
console.log(autenticado
  ? 'Sesión iniciada: se medirán las pantallas del CRM.'
  : 'Sin credenciales (QA_EMAIL / QA_PASSWORD): se mide solo /api/health, que es público.');

// /api/health toca la base con un SELECT real, así que sirve para medir el
// límite de conexiones aunque no haya sesión.
const RUTAS = autenticado
  ? [
      ['/api/health', 'salud (SELECT 1)'],
      ['/api/metrics', 'métricas (agregados)'],
      ['/api/accounts?limit=25', 'listado de clientes'],
      ['/api/pipeline', 'pipeline'],
    ]
  : [['/api/health', 'salud (SELECT 1)']];

const resumen = [];

for (const [ruta, etiqueta] of RUTAS) {
  console.log(`\n===== ${etiqueta} — ${ruta} =====`);
  console.log('  conc   ok  err   %err     p50      p95      max    req/s');

  let limite = null;

  for (const n of ESCALONES) {
    const r = await escalon(ruta, n);

    console.log(
      `  ${String(r.n).padStart(4)}  ${String(r.ok).padStart(3)}  ${String(r.errores).padStart(3)}  ` +
      `${r.tasaError.toFixed(1).padStart(5)}%  ${String(r.p50).padStart(6)}ms ${String(r.p95).padStart(6)}ms ` +
      `${String(r.max).padStart(6)}ms  ${String(r.rps).padStart(5)}`
    );

    if (r.errores > 0) {
      console.log(`         estados: ${JSON.stringify(r.porEstado)}  primer fallo: ${r.muestraError}`);
    }

    if (r.tasaError > UMBRAL_ERRORES) {
      limite = n;
      console.log(`  -> LÍMITE: a ${n} simultáneas falla el ${r.tasaError.toFixed(1)}% (umbral ${UMBRAL_ERRORES}%)`);
      break;
    }

    if (r.p50 > UMBRAL_P50_MS) {
      limite = n;
      console.log(`  -> LÍMITE: a ${n} simultáneas la mediana es ${r.p50}ms (umbral ${UMBRAL_P50_MS}ms)`);
      break;
    }

    // Respiro entre escalones: sin él se mide la cola del anterior.
    await new Promise((r) => setTimeout(r, 2000));
  }

  resumen.push({ etiqueta, limite });
  if (!limite) console.log(`  -> sin degradación hasta ${ESCALONES[ESCALONES.length - 1]} simultáneas`);
}

console.log('\n===== RESUMEN =====');
for (const r of resumen) {
  console.log(`  ${r.etiqueta.padEnd(26)} ${r.limite ? `límite ~${r.limite} simultáneas` : `sin degradación hasta ${ESCALONES.at(-1)}`}`);
}

console.log(`
Cómo leerlo: la concurrencia NO es el número de clientes. 1000 clientes que
consultan el CRM unas pocas veces al día generan del orden de unas pocas
peticiones simultáneas en punta. El número de arriba dice cuántas soporta a la
vez, que es el dato que faltaba.`);
