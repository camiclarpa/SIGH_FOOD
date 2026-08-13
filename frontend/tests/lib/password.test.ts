/**
 * tests/lib/password.test.ts
 *
 * El hashing de contraseñas del staff del CRM. Sin cobertura aquí, una
 * regresión silenciosa deja entrar a cualquiera.
 */
import { describe, it, expect } from 'vitest';
import {
  hashearPassword,
  verificarPassword,
} from '../../packages/sighfood-domain/src/lib/password';

describe('hashearPassword', () => {
  it('acepta la contraseña correcta', async () => {
    const hash = await hashearPassword('ClaveSegura2026!');
    await expect(verificarPassword('ClaveSegura2026!', hash)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashearPassword('ClaveSegura2026!');
    await expect(verificarPassword('ClaveSegura2027!', hash)).resolves.toBe(false);
  });

  it('produce un hash distinto para la misma contraseña (sal aleatoria)', async () => {
    const a = await hashearPassword('MismaClave123!');
    const b = await hashearPassword('MismaClave123!');
    expect(a).not.toBe(b);
    // Aun siendo distintos, ambos validan
    await expect(verificarPassword('MismaClave123!', a)).resolves.toBe(true);
    await expect(verificarPassword('MismaClave123!', b)).resolves.toBe(true);
  });

  it('nunca guarda la contraseña en claro', async () => {
    const hash = await hashearPassword('SecretoLiteral999!');
    expect(hash).not.toContain('SecretoLiteral999!');
  });

  it('usa al menos 200.000 iteraciones (recomendación OWASP)', async () => {
    const hash = await hashearPassword('x'.repeat(16));
    const iteraciones = Number.parseInt(hash.split(':')[0], 10);
    expect(iteraciones).toBeGreaterThanOrEqual(200_000);
  });
});

describe('verificarPassword ante datos corruptos', () => {
  it.each([
    ['cadena vacía', ''],
    ['sin separadores', 'noesunhash'],
    ['faltan campos', '210000:abcd'],
    ['iteraciones no numéricas', 'abc:dead:beef'],
    ['iteraciones negativas', '-1:dead:beef'],
  ])('devuelve false y no lanza con %s', async (_caso, almacenado) => {
    await expect(verificarPassword('cualquiera', almacenado)).resolves.toBe(false);
  });
});
