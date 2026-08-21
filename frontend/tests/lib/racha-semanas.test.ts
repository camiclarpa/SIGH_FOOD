// =============================================================================
// Racha de semanas consecutivas
// =============================================================================
//
// El criterio 'racha_semanas' devolvía 0 fijo, así que la insignia de constancia
// no se otorgaba nunca. Lo que se prueba aquí es la parte con criterio propio:
// qué cuenta como "seguidas" y qué racha se premia.
//
// La lectura de las fechas en el huso del negocio la hace Postgres y se
// comprueba contra la base real; esto cubre la lógica pura.

import { describe, it, expect } from 'vitest';
import { rachaMasLarga } from '../../apps/web/src/lib/fidelizacion';

/** Lunes consecutivos, en UTC, como los devuelve date_trunc. */
const lunes = (...dias: string[]) => dias.map((d) => new Date(`${d}T00:00:00Z`));

describe('rachaMasLarga', () => {
  it('sin actividad la racha es 0', () => {
    expect(rachaMasLarga([])).toBe(0);
  });

  it('una sola semana ya es una racha de 1', () => {
    expect(rachaMasLarga(lunes('2026-06-01'))).toBe(1);
  });

  it('cuenta las semanas encadenadas', () => {
    expect(rachaMasLarga(lunes('2026-06-01', '2026-06-08', '2026-06-15'))).toBe(3);
  });

  it('una semana de por medio corta la racha', () => {
    // 01 y 08 seguidas, luego falta el 15, luego el 22 empieza de nuevo.
    expect(rachaMasLarga(lunes('2026-06-01', '2026-06-08', '2026-06-22'))).toBe(2);
  });

  it('semanas sueltas nunca encadenan', () => {
    expect(rachaMasLarga(lunes('2026-06-01', '2026-06-15', '2026-06-29'))).toBe(1);
  });

  it('premia la mejor racha, no la última', () => {
    // Tres seguidas, un hueco, y una suelta: la insignia es un logro y no se
    // pierde por dejar de venir una semana.
    expect(rachaMasLarga(lunes('2026-06-01', '2026-06-08', '2026-06-15', '2026-06-29'))).toBe(3);
  });

  it('cuenta bien atravesando un cambio de mes y de año', () => {
    expect(rachaMasLarga(lunes('2026-12-21', '2026-12-28', '2027-01-04'))).toBe(3);
  });

  it('no confunde días sueltos con semanas', () => {
    // Si alguna vez llegara algo sin truncar, dos fechas a un día de distancia
    // no deben contarse como semanas seguidas.
    expect(rachaMasLarga(lunes('2026-06-01', '2026-06-02'))).toBe(1);
  });
});
