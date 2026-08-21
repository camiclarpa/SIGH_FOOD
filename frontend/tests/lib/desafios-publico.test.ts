// =============================================================================
// La respuesta correcta no puede salir hacia el comensal
// =============================================================================
//
// Este es el invariante de seguridad de los desafíos en mesa. El objeto que
// devuelve el endpoint público se serializa tal cual al navegador: si `correcta`
// viaja dentro, se lee abriendo las herramientas de desarrollo y el desafío deja
// de tener sentido — y como los aciertos dan puntos canjeables, el fallo cuesta
// dinero.
//
// Se prueba aquí, sin base de datos, para que un cambio en el esquema o en el
// mapeo lo rompa en el acto y no en producción.

import { describe, it, expect } from 'vitest';
import { sinRespuestas } from '../../apps/web/src/lib/desafios';

describe('sinRespuestas', () => {
  const preguntas = [
    { pregunta: '¿Qué nota predomina?', opciones: ['Cítrico', 'Ahumado'], correcta: 1 },
    { pregunta: '¿Cuál te gustó más?', opciones: ['A', 'B'] },
  ];

  it('quita el campo correcta', () => {
    for (const p of sinRespuestas(preguntas)) {
      expect(p).not.toHaveProperty('correcta');
    }
  });

  it('no deja rastro de la respuesta ni al serializar', () => {
    // Es como viaja de verdad: si el campo sobrevive a JSON.stringify, está en
    // la red.
    expect(JSON.stringify(sinRespuestas(preguntas))).not.toContain('correcta');
  });

  it('conserva lo que el comensal sí necesita', () => {
    const [p] = sinRespuestas(preguntas);
    expect(p!.pregunta).toBe('¿Qué nota predomina?');
    expect(p!.opciones).toEqual(['Cítrico', 'Ahumado']);
  });

  it('no arrastra campos que no estén en la lista blanca', () => {
    // El día que el esquema gane un campo nuevo —una pista, una explicación
    // interna— no debe colarse solo. Por eso se reconstruye campo a campo en
    // lugar de borrar `correcta`.
    const conExtras = [
      { pregunta: 'P', opciones: ['A', 'B'], correcta: 0, notaInterna: 'la buena es la A' },
    ] as Array<{ pregunta: string; opciones: string[]; correcta?: number }>;

    expect(JSON.stringify(sinRespuestas(conExtras))).not.toContain('notaInterna');
    expect(JSON.stringify(sinRespuestas(conExtras))).not.toContain('la buena');
  });

  it('aguanta un desafío sin preguntas', () => {
    expect(sinRespuestas(null)).toEqual([]);
    expect(sinRespuestas([])).toEqual([]);
  });
});
