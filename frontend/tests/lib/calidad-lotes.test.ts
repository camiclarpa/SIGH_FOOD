// =============================================================================
// El umbral que decide si se retira una tanda
// =============================================================================
//
// Esta regla saca producto de circulación, así que equivocarse cuesta dinero en
// las dos direcciones:
//
//   · Alertar de más hace que se deje de mirar el panel. Una lista de alertas
//     llena de falsos positivos es igual de inútil que una lista vacía.
//   · Alertar de menos deja producto malo en la calle, que es peor.
//
// «Avisar por encima del 2% de reseñas negativas» es la regla correcta CON
// VOLUMEN. Con cinco reseñas no lo es: una sola queja da el 20% y se alertaría
// por cada cliente descontento que aparezca.
//
// Por eso son dos reglas y no una, y por eso están probadas aparte.

import { describe, it, expect } from 'vitest';
import {
  evaluarLote,
  MUESTRA_MINIMA,
  PORCENTAJE_ALERTA,
  QUEJAS_ABSOLUTAS,
} from '../../apps/web/src/lib/calidad';

describe('cuándo hay que revisar una tanda', () => {
  it('tres quejas alertan aunque haya poquísimas reseñas', () => {
    /*
      La regla que evita el punto ciego.

      Una tanda mala con pocas ventas nunca llegaría a la muestra mínima, así que
      con el porcentaje solo no alertaría jamás — y es justo cuando más a tiempo
      se está de retirarla.
    */
    const r = evaluarLote({ resenas: 4, negativas: 3 });
    expect(r.alerta).toBe(true);
    expect(r.motivo).toContain('3 quejas');
  });

  it('una queja suelta NO alerta, aunque sea el 20%', () => {
    // Con cinco reseñas, un descontento da el 20%. Aplicar el 2% tal cual
    // convertiría a cada cliente enfadado en una alerta de producción.
    const r = evaluarLote({ resenas: 5, negativas: 1 });
    expect(r.alerta).toBe(false);
  });

  it('dos quejas tampoco, y se dice por qué', () => {
    // El silencio con pocas reseñas puede confundirse con "va bien". Se explica
    // que la muestra es corta en vez de dejarlo en blanco.
    const r = evaluarLote({ resenas: 6, negativas: 2 });
    expect(r.alerta).toBe(false);
    expect(r.motivo).toMatch(/muestra corta/i);
  });

  it('con muestra suficiente sí manda el porcentaje', () => {
    // 2 de 50 son el 4%: por encima del umbral, y con muestra que lo respalda.
    const r = evaluarLote({ resenas: 50, negativas: 2 });
    expect(r.alerta).toBe(true);
    expect(r.motivo).toContain('%');
  });

  it('justo en el umbral no alerta', () => {
    // El 2% exacto no supera el 2%. Se comprueba porque un `>=` mal puesto
    // convertiría cada tanda grande y normal en una alerta.
    const resenas = 100;
    const negativas = 2; // exactamente el 2%
    expect(evaluarLote({ resenas, negativas }).alerta).toBe(false);
  });

  it('una tanda perfecta no dice nada raro', () => {
    const r = evaluarLote({ resenas: 40, negativas: 0 });
    expect(r.alerta).toBe(false);
    expect(r.motivo).toMatch(/sin incidencias/i);
  });

  it('una tanda sin reseñas se distingue de una buena', () => {
    // No es lo mismo "nadie se ha quejado" que "nadie ha opinado". Mezclarlos
    // haría que una tanda sin vender pareciera aprobada.
    const r = evaluarLote({ resenas: 0, negativas: 0 });
    expect(r.alerta).toBe(false);
    expect(r.motivo).toMatch(/sin reseñas/i);
  });

  it('los umbrales son los acordados', () => {
    // Si alguien los cambia, que sea a conciencia y no de pasada.
    expect(PORCENTAJE_ALERTA).toBe(2);
    expect(QUEJAS_ABSOLUTAS).toBe(3);
    expect(MUESTRA_MINIMA).toBe(20);
  });
});
