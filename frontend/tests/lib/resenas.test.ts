// =============================================================================
// Clasificación de reseñas
// =============================================================================
//
// La distinción que justifica todo este módulo:
//
//   "llegó frío"              -> fallo de reparto. Se arregla.
//   "no me gusta el picante"  -> preferencia. NO se arregla.
//
// Son la misma nota de dos estrellas y problemas opuestos. Confundirlos lleva a
// suavizar un producto que a los demás les gusta justo así, y a llenar la lista
// de alertas de cosas que no son alertas — con lo que se deja de mirar la lista.
//
// Aquí se prueba la parte que NO necesita modelo: la que deduce la causa de los
// motivos que la persona marcó. Es la que decide en la mayoría de los casos, y
// la única que da la misma respuesta mañana.

import { describe, it, expect } from 'vitest';
import { categoriaPorMotivos } from '../../apps/web/src/lib/resenas';

describe('categoría por los motivos marcados', () => {
  it('una nota alta es un elogio, sin mirar nada más', () => {
    expect(categoriaPorMotivos(null, 5)).toBe('elogio');
    expect(categoriaPorMotivos(null, 4)).toBe('elogio');
  });

  it('llegó frío es cosa del reparto, no de la cocina', () => {
    // Salió bien y se enfrió por el camino. Perseguirlo en cocina no arregla
    // nada.
    expect(categoriaPorMotivos(['temperatura'], 2)).toBe('fallo_logistica');
  });

  it('tardar y el empaque también son del reparto', () => {
    expect(categoriaPorMotivos(['tiempo'], 2)).toBe('fallo_logistica');
    expect(categoriaPorMotivos(['empaque'], 3)).toBe('fallo_logistica');
  });

  it('la cantidad es de quien lo sirve', () => {
    expect(categoriaPorMotivos(['cantidad'], 2)).toBe('fallo_cocina');
  });

  it('el reparto gana cuando se marcan las dos cosas', () => {
    // Con "llegó frío" y "poca cantidad" a la vez, lo urgente es la cadena de
    // entrega: es lo que afecta a TODOS los pedidos de ese turno, no solo a
    // este plato.
    expect(categoriaPorMotivos(['cantidad', 'temperatura'], 2)).toBe('fallo_logistica');
  });

  it('"el sabor" a secas NO se clasifica sin leer el texto', () => {
    /*
      La decisión más importante del archivo.

      "Le falta sal" y "no me gusta el picante" se marcan igual, y son un fallo
      y una preferencia. Adivinar aquí significaría acertar la mitad de las
      veces, así que se deja para el modelo, que sí lee lo que escribió.
    */
    expect(categoriaPorMotivos(['sabor'], 2)).toBeNull();
  });

  it('sin motivos ni nota alta, tampoco se adivina', () => {
    expect(categoriaPorMotivos(null, 2)).toBeNull();
    expect(categoriaPorMotivos([], 3)).toBeNull();
  });

  it('sin nota se sigue pudiendo deducir del motivo', () => {
    // La nota puede faltar; el motivo marcado sigue diciendo de quién es.
    expect(categoriaPorMotivos(['temperatura'], null)).toBe('fallo_logistica');
  });

  it('un motivo desconocido no se fuerza a ninguna caja', () => {
    // "otro" existe justo para esto: la persona dice que algo falló pero no
    // encaja en las opciones. Meterlo a la fuerza en cocina o reparto sería
    // inventarse un dato.
    expect(categoriaPorMotivos(['otro'], 2)).toBeNull();
  });
});
