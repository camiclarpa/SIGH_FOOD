/**
 * tests/lib/observabilidad.test.ts
 *
 * Lo crítico aquí no es el formato del log, sino que no acabe escribiendo datos
 * personales en un sistema de terceros. El CRM guarda teléfonos y correos de
 * comensales bajo Habeas Data; un `console.log(body)` los filtraría.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, conTrazas } from '../../packages/sighfood-domain/src/lib/observabilidad';

let salida: string[] = [];

beforeEach(() => {
  salida = [];
  vi.spyOn(console, 'log').mockImplementation((l: string) => { salida.push(l); });
  vi.spyOn(console, 'warn').mockImplementation((l: string) => { salida.push(l); });
  vi.spyOn(console, 'error').mockImplementation((l: string) => { salida.push(l); });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saneado de datos sensibles', () => {
  it.each([
    'password',
    'passwordHash',
    'token',
    'secret',
    'authorization',
    'apiKey',
    'whatsapp',
    'phone',
    'email',
  ])('oculta el campo %s', (campo) => {
    log.info('prueba', { [campo]: 'VALOR-REAL-SECRETO' });

    const linea = salida.join('');
    expect(linea).not.toContain('VALOR-REAL-SECRETO');
    expect(linea).toContain('[oculto]');
  });

  it('oculta campos sensibles anidados', () => {
    log.info('prueba', { lead: { nombre: 'Ana', whatsapp: '+573001234567' } });

    const linea = salida.join('');
    expect(linea).not.toContain('+573001234567');
    expect(linea).toContain('Ana'); // lo no sensible se conserva
  });

  it('conserva los campos no sensibles', () => {
    log.info('prueba', { ruta: '/api/metrics', estado: 200, duracionMs: 42 });

    const entrada = JSON.parse(salida[0]);
    expect(entrada.ruta).toBe('/api/metrics');
    expect(entrada.estado).toBe(200);
    expect(entrada.duracionMs).toBe(42);
  });
});

describe('formato', () => {
  it('emite JSON por línea con nivel y marca de tiempo', () => {
    log.warn('algo raro', { ruta: '/x' });

    const entrada = JSON.parse(salida[0]);
    expect(entrada.nivel).toBe('warn');
    expect(entrada.mensaje).toBe('algo raro');
    expect(typeof entrada.ts).toBe('string');
  });

  it('serializa el error con nombre, mensaje y stack', () => {
    log.error('falló', new Error('base caída'));

    const entrada = JSON.parse(salida[0]);
    expect(entrada.error.nombre).toBe('Error');
    expect(entrada.error.mensaje).toBe('base caída');
    expect(entrada.error.stack).toBeTruthy();
  });
});

describe('conTrazas', () => {
  it('registra las peticiones correctas y añade x-request-id', async () => {
    const handler = conTrazas('/api/test', async () => new Response('ok', { status: 200 }));
    const respuesta = await handler(new Request('https://x.test/api/test'));

    expect(respuesta.headers.get('x-request-id')).toBeTruthy();
    expect(JSON.parse(salida[0]).estado).toBe(200);
  });

  it('registra como error las respuestas 5xx', async () => {
    const handler = conTrazas('/api/test', async () => new Response('boom', { status: 500 }));
    await handler(new Request('https://x.test/api/test'));

    expect(JSON.parse(salida[0]).nivel).toBe('error');
  });

  it('registra las excepciones y las vuelve a lanzar', async () => {
    const handler = conTrazas('/api/test', async () => { throw new Error('explotó'); });

    await expect(handler(new Request('https://x.test/api/test'))).rejects.toThrow('explotó');

    const entrada = JSON.parse(salida[0]);
    expect(entrada.nivel).toBe('error');
    expect(entrada.error.mensaje).toBe('explotó');
  });
});
