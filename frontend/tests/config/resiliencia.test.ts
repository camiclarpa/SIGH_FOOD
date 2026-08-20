/**
 * tests/config/resiliencia.test.ts
 *
 * Guarda las defensas que impiden que el CRM quede inaccesible sin que nadie se
 * entere.
 *
 * El caso que las motivó: el Worker se desplegó sin AUTH_SECRET y todo
 * /api/auth/* devolvió 500 con "There was a problem with the server
 * configuration". Ninguna contraseña habría servido. El código estaba bien, los
 * tests pasaban y Workers Builds dio el despliegue por bueno — publicar y
 * funcionar no son lo mismo. Se descubrió cuando alguien intentó entrar.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const WEB = path.join(RAIZ, 'apps', 'web', 'src');

const leer = (...p: string[]) => readFileSync(path.join(...p), 'utf8');

describe('endpoint de salud', () => {
  const ruta = path.join(WEB, 'app', 'api', 'health', 'route.ts');

  it('existe', () => {
    expect(existsSync(ruta), 'sin /api/health una caída solo se detecta usando el CRM').toBe(true);
  });

  const contenido = leer(ruta);

  it('comprueba el secreto de sesión, que es lo que faltó', () => {
    expect(contenido).toMatch(/AUTH_SECRET/);
  });

  it('comprueba la base con una consulta real, no solo abriendo la conexión', () => {
    // Hyperdrive puede entregar un cliente que falle en el primer SELECT: sin
    // consultar de verdad, la comprobación daría verde con la base caída.
    expect(contenido).toMatch(/SELECT 1/i);
  });

  it('devuelve 503 cuando algo crítico falla', () => {
    // 200 siempre haría inútil el endpoint: un monitor externo no distingue
    // "sano" de "responde pero está roto" sin interpretar el cuerpo.
    expect(contenido).toMatch(/status:\s*caidas\.length\s*\?\s*503/);
  });

  it('no expone valores de configuración', () => {
    // Es público a propósito. Puede decir si un secreto está presente, nunca
    // cuánto mide ni a qué apunta.
    expect(contenido).not.toMatch(/detalle:\s*secreto\b/);
    expect(contenido).not.toMatch(/connectionString/);
  });
});

describe('middleware: el health check debe ser alcanzable durante un incidente', () => {
  const middleware = leer(path.join(WEB, 'middleware.ts'));

  it('/api/health no exige sesión', () => {
    // Comprobar la salud a través de la sesión no sirve cuando lo roto ES la
    // sesión, que es exactamente el caso que ocurrió.
    expect(middleware).toMatch(/'\/api\/health'/);
  });

  it('/api/health no está sujeto al rate limiting', () => {
    // Un endpoint de salud al que se puede acallar con un 429 falla justo
    // cuando hace falta.
    expect(middleware).toMatch(/pathname === '\/api\/health'/);
  });
});

describe('reintentos ante fallos transitorios de la base', () => {
  const cloudflare = leer(path.join(WEB, 'lib', 'cloudflare.ts'));

  it('conBaseDeDatos reintenta', () => {
    expect(cloudflare).toMatch(/esTransitorio/);
    expect(cloudflare).toMatch(/REINTENTOS/);
  });

  it('solo reintenta fallos de conexión, no errores de consulta', () => {
    // Reintentar una violación de restricción no la arregla: solo repite el
    // fallo y multiplica su latencia.
    expect(cloudflare).toMatch(/CONNECTION_CLOSED/);
    expect(cloudflare).toMatch(/if \(!esTransitorio\(e\)/);
  });

  it('espera de forma creciente entre intentos', () => {
    // Reintentar de inmediato empeora el problema si la causa es saturación.
    expect(cloudflare).toMatch(/2 \*\* intento/);
  });
});

describe('límites de error: un fallo no debe dejar pantalla en blanco', () => {
  it('las pantallas del CRM tienen su propio límite', () => {
    const ruta = path.join(WEB, 'app', '(crm)', 'error.tsx');
    expect(existsSync(ruta), 'sin error.tsx, un fallo de consulta pinta la pantalla genérica de Next').toBe(true);
    const contenido = readFileSync(ruta, 'utf8');
    // Debe poder reintentarse sin recargar a mano.
    expect(contenido).toMatch(/reset/);
  });

  it('existe un límite raíz para cuando falla el propio layout', () => {
    const ruta = path.join(WEB, 'app', 'global-error.tsx');
    expect(existsSync(ruta)).toBe(true);
    const contenido = readFileSync(ruta, 'utf8');
    // Reemplaza el documento entero, así que necesita html y body propios.
    expect(contenido).toMatch(/<html/);
    expect(contenido).toMatch(/<body/);
    // Sin clases de Tailwind: si lo que falló fue cargar los estilos, depender
    // de ellos dejaría el mensaje ilegible.
    expect(contenido).not.toMatch(/className="/);
  });
});

describe('el despliegue comprueba que el CRM quedó operativo', () => {
  const flujo = readFileSync(path.join(RAIZ, '..', '.github', 'workflows', 'deploy.yml'), 'utf8');

  it('hay un job que consulta /api/health tras el despliegue', () => {
    // La verificación de tipos y tests no habría detectado la caída: el código
    // estaba bien, lo que faltaba era un secreto en el Worker.
    expect(flujo).toMatch(/\/api\/health/);
  });

  it('falla el workflow si el CRM responde 503', () => {
    expect(flujo).toMatch(/503/);
    expect(flujo).toMatch(/::error::/);
  });
});
