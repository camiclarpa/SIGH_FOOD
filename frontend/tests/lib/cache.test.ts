/**
 * tests/lib/cache.test.ts
 *
 * La caché de métricas. Lo que importa no es solo que guarde, sino que un pico
 * de peticiones con la caché fría no dispare N consultas idénticas contra la
 * base de datos.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conCache, invalidarCache } from '../../packages/sighfood-domain/src/lib/cache';

describe('conCache', () => {
  beforeEach(() => {
    invalidarCache();
  });

  it('calcula una vez y reutiliza el resultado', async () => {
    const calcular = vi.fn().mockResolvedValue({ total: 42 });

    const primero = await conCache('k1', 60, calcular);
    const segundo = await conCache('k1', 60, calcular);

    expect(primero).toEqual({ total: 42 });
    expect(segundo).toEqual({ total: 42 });
    expect(calcular).toHaveBeenCalledTimes(1);
  });

  it('vuelve a calcular cuando vence el TTL', async () => {
    vi.useFakeTimers();
    try {
      const calcular = vi.fn().mockResolvedValue('valor');

      await conCache('k2', 60, calcular);
      vi.advanceTimersByTime(61_000);
      await conCache('k2', 60, calcular);

      expect(calcular).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('comparte la promesa entre peticiones concurrentes (evita el stampede)', async () => {
    let resolver: (v: string) => void = () => {};
    const enCurso = new Promise<string>((r) => { resolver = r; });
    const calcular = vi.fn().mockReturnValue(enCurso);

    // 10 peticiones simultáneas con la caché fría
    const todas = Promise.all(
      Array.from({ length: 10 }, () => conCache('k3', 60, calcular))
    );
    resolver('resultado');
    const resultados = await todas;

    expect(resultados).toHaveLength(10);
    expect(resultados.every((r) => r === 'resultado')).toBe(true);
    // Una sola consulta a la base, no diez
    expect(calcular).toHaveBeenCalledTimes(1);
  });

  it('mantiene claves distintas separadas', async () => {
    await conCache('a', 60, async () => 'valorA');
    await conCache('b', 60, async () => 'valorB');

    expect(await conCache('a', 60, async () => 'otro')).toBe('valorA');
    expect(await conCache('b', 60, async () => 'otro')).toBe('valorB');
  });

  it('invalidarCache con clave solo borra esa entrada', async () => {
    await conCache('x', 60, async () => 'valorX');
    await conCache('y', 60, async () => 'valorY');

    invalidarCache('x');

    expect(await conCache('x', 60, async () => 'recalculado')).toBe('recalculado');
    expect(await conCache('y', 60, async () => 'recalculado')).toBe('valorY');
  });

  it('no cachea el fallo: si `calcular` lanza, el siguiente intento reintenta', async () => {
    const calcular = vi
      .fn()
      .mockRejectedValueOnce(new Error('BD caída'))
      .mockResolvedValueOnce('recuperado');

    await expect(conCache('z', 60, calcular)).rejects.toThrow('BD caída');
    await expect(conCache('z', 60, calcular)).resolves.toBe('recuperado');
  });
});
