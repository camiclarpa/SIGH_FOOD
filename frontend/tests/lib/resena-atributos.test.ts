// =============================================================================
// La validación de los atributos de una reseña
// =============================================================================
//
// Este archivo existe por un fallo que llegó a producción y que el compilador
// no podía ver.
//
// El esquema estaba escrito como:
//
//     z.record(z.enum(['crocancia','sabor','empaque','frescura']), z.number())
//
// En Zod 4, un record con clave de ENUM exige que estén TODAS las claves. Quien
// puntuaba solo la crocancia recibía «expected number, received undefined» y se
// perdía la reseña ENTERA — la nota incluida, que es lo único que de verdad
// importaba.
//
// Los tipos encajaban perfectamente. Lo encontró una petición real contra la
// tienda desplegada, no `tsc`. De ahí que esto se pruebe con datos y no con
// tipos: la forma correcta del esquema no es algo que TypeScript pueda afirmar.

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/** El esquema tal y como está en apps/tienda/src/app/api/resena/route.ts. */
const atributosParciales = z.object({
  crocancia: z.number().int().min(1).max(5).optional(),
  sabor: z.number().int().min(1).max(5).optional(),
  empaque: z.number().int().min(1).max(5).optional(),
  frescura: z.number().int().min(1).max(5).optional(),
});

describe('atributos de calidad', () => {
  it('acepta UN solo atributo', () => {
    // El caso que fallaba. Es además el más frecuente: casi nadie puntúa las
    // cuatro cosas.
    expect(atributosParciales.safeParse({ crocancia: 5 }).success).toBe(true);
  });

  it('acepta dos', () => {
    expect(atributosParciales.safeParse({ crocancia: 5, sabor: 4 }).success).toBe(true);
  });

  it('acepta los cuatro', () => {
    const r = atributosParciales.safeParse({
      crocancia: 5,
      sabor: 4,
      empaque: 3,
      frescura: 5,
    });
    expect(r.success).toBe(true);
  });

  it('acepta ninguno', () => {
    // Un objeto vacío es válido: quien no quiera puntuar nada no debe bloquear
    // el envío de su nota.
    expect(atributosParciales.safeParse({}).success).toBe(true);
  });

  it('rechaza un valor fuera de 1 a 5', () => {
    expect(atributosParciales.safeParse({ crocancia: 9 }).success).toBe(false);
    expect(atributosParciales.safeParse({ crocancia: 0 }).success).toBe(false);
  });

  it('rechaza un decimal', () => {
    // Son estrellas, no una media. Un 4,5 vendría de un cliente manipulado.
    expect(atributosParciales.safeParse({ sabor: 4.5 }).success).toBe(false);
  });

  it('ignora un atributo que no existe en vez de romper', () => {
    /*
      Zod descarta las claves desconocidas por defecto, y aquí es lo correcto:
      si algún día la tienda manda un atributo nuevo antes de que el servidor lo
      conozca, se guarda lo que sí entiende en lugar de perder la reseña entera.
    */
    const r = atributosParciales.safeParse({ crocancia: 5, untuosidad: 3 });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty('untuosidad');
  });
});
