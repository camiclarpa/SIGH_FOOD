/**
 * tests/lib/respaldo.test.ts
 *
 * Comprueba el modo degradado de solo lectura: si Neon no responde, el CRM
 * sirve la última copia buena en vez de caerse entero.
 *
 * Se prueba la lógica contra un doble del namespace KV, porque el binding real
 * solo existe dentro de un Worker. Lo que se verifica aquí es el
 * comportamiento, que es donde están las decisiones delicadas: cuándo servir
 * datos viejos, cuándo negarse, y cuándo escribir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// El módulo lee el binding a través de contextoCloudflare(); se sustituye para
// poder inyectar un KV falso y decidir si estamos "en Workers" o no.
const almacen = new Map<string, string>();

const kvFalso = {
  get: vi.fn(async (clave: string) => almacen.get(clave) ?? null),
  put: vi.fn(async (clave: string, valor: string) => {
    almacen.set(clave, valor);
  }),
};

let hayBinding = true;

vi.mock('@/lib/cloudflare', () => ({
  contextoCloudflare: async () => (hayBinding ? { env: { RESPALDO_LECTURA: kvFalso }, ctx: undefined } : {}),
}));

vi.mock('@sighfood/domain/lib/observabilidad', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { conRespaldo, describirAntiguedad } = await import('@crm/lib/respaldo');

const caidaDeRed = () => {
  throw new Error('Connection terminated unexpectedly');
};

beforeEach(() => {
  almacen.clear();
  hayBinding = true;
  vi.clearAllMocks();
});

describe('con la base sana', () => {
  it('devuelve los datos de la consulta, no del respaldo', async () => {
    almacen.set('panel', JSON.stringify({ guardado: Date.now(), datos: { cuentas: 999 } }));

    const r = await conRespaldo('panel', async () => ({ cuentas: 45 }));

    // Si devolviera 999 estaría sirviendo de caché, y el CRM mostraría cifras
    // viejas en funcionamiento normal: justo lo que no se quiere donde alguien
    // decide sobre stock y cobros.
    expect(r.datos).toEqual({ cuentas: 45 });
    expect(r.degradado).toBe(false);
  });

  it('guarda el respaldo para la próxima caída', async () => {
    await conRespaldo('panel', async () => ({ cuentas: 45 }));
    expect(kvFalso.put).toHaveBeenCalledOnce();
    expect(JSON.parse(almacen.get('panel')!).datos).toEqual({ cuentas: 45 });
  });

  it('no reescribe dentro de la ventana de refresco', async () => {
    // KV admite 1.000 escrituras al día en el plan gratuito. Sin este freno,
    // cada carga del panel gastaría una y la cuota se agotaría en una mañana,
    // dejando de escribirse justo antes de que hiciera falta.
    almacen.set('panel', JSON.stringify({ guardado: Date.now(), datos: { cuentas: 1 } }));

    await conRespaldo('panel', async () => ({ cuentas: 2 }));

    expect(kvFalso.put).not.toHaveBeenCalled();
  });

  it('sí refresca cuando el respaldo ya es viejo', async () => {
    const seisMinutos = Date.now() - 6 * 60 * 1000;
    almacen.set('panel', JSON.stringify({ guardado: seisMinutos, datos: { cuentas: 1 } }));

    await conRespaldo('panel', async () => ({ cuentas: 2 }));

    expect(kvFalso.put).toHaveBeenCalledOnce();
    expect(JSON.parse(almacen.get('panel')!).datos).toEqual({ cuentas: 2 });
  });

  it('un fallo al guardar no tumba una petición que ya tiene sus datos', async () => {
    kvFalso.put.mockRejectedValueOnce(new Error('KV no disponible'));

    const r = await conRespaldo('panel', async () => ({ cuentas: 45 }));

    expect(r.datos).toEqual({ cuentas: 45 });
    expect(r.degradado).toBe(false);
  });
});

describe('con la base caída', () => {
  it('sirve el respaldo y lo marca como degradado', async () => {
    almacen.set('panel', JSON.stringify({ guardado: Date.now() - 120_000, datos: { cuentas: 45 } }));

    const r = await conRespaldo('panel', caidaDeRed);

    expect(r.datos).toEqual({ cuentas: 45 });
    expect(r.degradado).toBe(true);
    expect(r.edadSegundos).toBeGreaterThanOrEqual(119);
  });

  it('propaga el error si no hay respaldo', async () => {
    // Sin copia previa es preferible el error a una pantalla vacía que parezca
    // "no hay datos": esa lectura llevaría a conclusiones falsas.
    await expect(conRespaldo('nunca-consultado', caidaDeRed)).rejects.toThrow('Connection terminated');
  });

  it('propaga el error original si KV tampoco responde', async () => {
    kvFalso.get.mockRejectedValueOnce(new Error('KV caído'));

    // El fallo relevante es el de la base, no el del respaldo.
    await expect(conRespaldo('panel', caidaDeRed)).rejects.toThrow('Connection terminated');
  });

  it('falla igual que antes si no hay binding (local, tests)', async () => {
    hayBinding = false;
    await expect(conRespaldo('panel', caidaDeRed)).rejects.toThrow('Connection terminated');
  });
});

describe('aislamiento entre consultas', () => {
  it('cada clave conserva su propio respaldo', async () => {
    await conRespaldo('cuentas:norte', async () => ({ zona: 'norte' }));
    await conRespaldo('cuentas:sur', async () => ({ zona: 'sur' }));

    const norte = await conRespaldo('cuentas:norte', caidaDeRed);

    // Compartir respaldo entre filtros haría que una búsqueda mostrara los
    // resultados de otra, que es peor que no mostrar nada.
    expect(norte.datos).toEqual({ zona: 'norte' });
  });
});

describe('describirAntiguedad', () => {
  it.each([
    [30, 'hace menos de un minuto'],
    [90, 'hace 2 minutos'],
    [60, 'hace 1 minuto'],
    [7200, 'hace 2 horas'],
  ])('%i segundos -> %s', (segundos, esperado) => {
    expect(describirAntiguedad(segundos)).toBe(esperado);
  });
});
