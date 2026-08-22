// =============================================================================
// Recomendador de paladar
// =============================================================================
//
// Tres preguntas que terminan en un cono. Lo que protege este test es la única
// respuesta que puede arruinarle la experiencia a alguien: recomendarle el
// Spicy Volcano a quien acaba de decir que no quiere picante.
//
// Se prueba la puntuación y no un árbol de decisiones porque es lo que hay: con
// reglas encadenadas, añadir un sexto sabor obliga a rehacer el árbol entero y
// una combinación imprevista se queda sin recomendación.

import { describe, it, expect } from 'vitest';
import { PREGUNTAS, aPreferencias, recomendar } from '../../apps/tienda/src/lib/paladar';

const CONOS = [
  { slug: 'spicy-volcano', familia: 'salado', intensidad: 3, disponible: true },
  { slug: 'smoked-cheese-truffle', familia: 'salado', intensidad: 2, disponible: true },
  { slug: 'sweet-salty-caramel', familia: 'dulce', intensidad: 1, disponible: true },
  { slug: 'tropical-anise', familia: 'dulce', intensidad: 2, disponible: true },
  { slug: 'herbal-citrus', familia: 'fresco', intensidad: 1, disponible: true },
];

describe('recomendar', () => {
  it('a quien quiere salado y picante le da el Volcano', () => {
    const r = recomendar({ eje: 'salado', picante: 'mucho', intensidad: 'contundente' }, CONOS);
    expect(r?.slug).toBe('spicy-volcano');
  });

  it('NUNCA le da el Volcano a quien dijo que no quiere picante', () => {
    // El caso que más importa: es la única recomendación que puede arruinar
    // la primera experiencia de alguien con la marca.
    for (const intensidad of ['contundente', 'ligero', 'raro']) {
      for (const eje of ['salado', 'dulce', 'nose']) {
        const r = recomendar({ eje, picante: 'nada', intensidad }, CONOS);
        expect(r?.slug, `eje=${eje} intensidad=${intensidad}`).not.toBe('spicy-volcano');
      }
    }
  });

  it('respeta el eje dulce', () => {
    const r = recomendar({ eje: 'dulce', picante: 'nada', intensidad: 'ligero' }, CONOS);
    expect(['sweet-salty-caramel', 'tropical-anise']).toContain(r?.slug);
  });

  it('"sorpréndeme" tira hacia lo menos evidente', () => {
    const r = recomendar({ eje: 'nose', picante: 'nada', intensidad: 'ligero' }, CONOS);
    expect(r?.slug).toBe('herbal-citrus');
  });

  it('siempre recomienda algo, aunque las respuestas sean absurdas', () => {
    // Sumando puntos siempre gana alguno. Con un árbol de decisiones, una
    // combinación imprevista dejaría a la persona sin respuesta.
    const r = recomendar({ eje: 'zzz', picante: 'zzz', intensidad: 'zzz' }, CONOS);
    expect(r).not.toBeNull();
  });

  it('solo recomienda lo que está disponible', () => {
    const soloUno = CONOS.map((c) => ({ ...c, disponible: c.slug === 'herbal-citrus' }));
    const r = recomendar({ eje: 'salado', picante: 'mucho', intensidad: 'contundente' }, soloUno);
    expect(r?.slug).toBe('herbal-citrus');
  });

  it('no inventa una recomendación si no hay nada disponible', () => {
    // Fingir una y mandar a la persona a un producto agotado es peor que
    // decirle que mire el catálogo.
    expect(recomendar({ eje: 'salado' }, CONOS.map((c) => ({ ...c, disponible: false })))).toBeNull();
  });

  it('da un motivo legible, no un número', () => {
    const r = recomendar({ eje: 'salado', picante: 'mucho', intensidad: 'contundente' }, CONOS);
    expect(r?.motivo).toMatch(/^Porque .+\.$/);
  });
});

describe('el cuestionario', () => {
  it('son tres preguntas, no un formulario', () => {
    // Cada pregunta de más cuesta gente, y compite contra "leer el catálogo".
    expect(PREGUNTAS).toHaveLength(3);
  });

  it('toda pregunta tiene al menos dos salidas', () => {
    for (const p of PREGUNTAS) {
      expect(p.opciones.length, p.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('aPreferencias', () => {
  it('traduce al formato que ya usa el CRM', () => {
    // Misma forma que flavorPreference, para que lo que dice que le gusta y lo
    // que pide de verdad se sumen en el mismo sitio.
    const p = aPreferencias({ eje: 'salado', picante: 'mucho', intensidad: 'contundente' });
    expect(p.umami_boost).toBe(1);
    expect(p.spicy_volcano).toBe(2);
  });

  it('un perfil vacío no inventa preferencias', () => {
    expect(aPreferencias({})).toEqual({});
  });
});
