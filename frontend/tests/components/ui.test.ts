/**
 * tests/components/ui.test.ts
 *
 * describirAntiguedad() vivía en lib/respaldo.ts, junto al cálculo que la
 * necesita, hasta que un componente 'use client' necesitó usarla y arrastró
 * con ella el driver de Postgres entero al bundle del navegador (lib/respaldo
 * importa lib/cloudflare). Se movió a components/ui.tsx, que no importa nada
 * de servidor — el mismo test que lo detectó vive en
 * tests/config/cliente-servidor.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { describirAntiguedad } from '@crm/components/ui';

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
