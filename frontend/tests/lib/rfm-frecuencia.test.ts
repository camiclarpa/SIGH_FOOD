// Las dos decisiones que deciden a quién se le escribe y a quién no.
//
// `clasificar` es política comercial, no cálculo: el ORDEN de sus ramas define
// a quién considera el negocio un cliente en riesgo. Y el tope de frecuencia es
// lo que protege el número de WhatsApp. Las dos son puras a propósito, para que
// puedan revisarse contra una tabla de casos en vez de contra una consulta.

import { describe, it, expect } from 'vitest';
import { clasificar, repartoPorSegmento, FACTOR_RIESGO, type FilaRFM } from '../../apps/web/src/lib/rfm';
import {
  ventanaDesde,
  motivoDelTope,
  MAXIMO_POR_VENTANA,
  DIAS_DE_VENTANA,
} from '../../apps/web/src/lib/frecuencia';

describe('clasificar por RFM', () => {
  it('sin pedidos entregados es "nuevo", no "en riesgo"', () => {
    // Decir que alguien que nunca compró está en riesgo de abandono es ruido:
    // no puede abandonar lo que no empezó.
    const r = clasificar({ recencia: null, frecuencia: 0, monetario: 0, retraso: null });
    expect(r.segmento).toBe('nuevo');
    expect(r.enRiesgo).toBe(false);
  });

  it('el riesgo se mira ANTES que el valor', () => {
    // El caso que más dinero cuesta: alguien que gastaba mucho y lleva el doble
    // de lo suyo sin aparecer. Clasificarlo como campeón por lo que gastó el
    // mes pasado es perder al mejor cliente sin enterarse.
    const r = clasificar({ recencia: 40, frecuencia: 12, monetario: 900_000, retraso: 2 });
    expect(r.enRiesgo).toBe(true);
    expect(r.segmento).toBe('en_riesgo');
  });

  it('muy pasado de vuelta ya es "dormido", que pide otro mensaje', () => {
    const r = clasificar({ recencia: 120, frecuencia: 8, monetario: 400_000, retraso: 4 });
    expect(r.segmento).toBe('dormido');
    expect(r.enRiesgo).toBe(true);
  });

  it('justo en el umbral ya cuenta como riesgo', () => {
    const r = clasificar({ recencia: 15, frecuencia: 5, monetario: 200_000, retraso: FACTOR_RIESGO });
    expect(r.enRiesgo).toBe(true);
  });

  it('un pelo por debajo, no', () => {
    const r = clasificar({ recencia: 14, frecuencia: 5, monetario: 200_000, retraso: 1.49 });
    expect(r.enRiesgo).toBe(false);
  });

  it('campeón exige frecuencia Y gasto', () => {
    const campeon = clasificar({ recencia: 3, frecuencia: 6, monetario: 250_000, retraso: 0.5 });
    expect(campeon.segmento).toBe('campeon');

    // Un solo pedido enorme —una fiesta— no convierte en campeón a quien no ha
    // vuelto.
    const unaFiesta = clasificar({ recencia: 3, frecuencia: 1, monetario: 800_000, retraso: null });
    expect(unaFiesta.segmento).toBe('prometedor');
  });

  it('pocos pedidos pero recientes es "prometedor"', () => {
    const r = clasificar({ recencia: 2, frecuencia: 2, monetario: 64_000, retraso: null });
    expect(r.segmento).toBe('prometedor');
    expect(r.enRiesgo).toBe(false);
  });

  it('recurrente sin llegar a campeón es "leal"', () => {
    const r = clasificar({ recencia: 5, frecuencia: 4, monetario: 128_000, retraso: 0.8 });
    expect(r.segmento).toBe('leal');
  });

  it('sin intervalo habitual no se inventa riesgo', () => {
    // retraso null = no hay suficientes pedidos para saber cada cuánto viene.
    const r = clasificar({ recencia: 200, frecuencia: 2, monetario: 64_000, retraso: null });
    expect(r.enRiesgo).toBe(false);
  });
});

describe('reparto por segmento', () => {
  it('cuenta todos los segmentos, incluidos los vacíos', () => {
    const filas = [
      { segmento: 'campeon' }, { segmento: 'campeon' }, { segmento: 'en_riesgo' },
    ] as FilaRFM[];
    const r = repartoPorSegmento(filas);
    expect(r.campeon).toBe(2);
    expect(r.en_riesgo).toBe(1);
    expect(r.dormido).toBe(0);
  });
});

describe('ventana de frecuencia', () => {
  it('es móvil, no semana natural', () => {
    // Con semanas naturales se pueden mandar tres el domingo por la noche y
    // tres el lunes por la mañana sin superar ningún tope, y quien lo recibe ha
    // tenido seis mensajes en doce horas.
    const ahora = new Date('2026-08-22T15:00:00Z');
    const desde = ventanaDesde(ahora);
    expect(ahora.getTime() - desde.getTime()).toBe(DIAS_DE_VENTANA * 24 * 3600 * 1000);
  });

  it('el motivo explica el porqué y ofrece salida', () => {
    // Quien lo lee está a punto de pensar que el CRM está roto.
    const texto = motivoDelTope({ enviados: MAXIMO_POR_VENTANA, restantes: 0, puede: false });
    expect(texto).toContain(String(MAXIMO_POR_VENTANA));
    expect(texto).toContain(String(DIAS_DE_VENTANA));
    expect(texto).toMatch(/bandeja/i);
  });

  it('el tope es conservador a propósito', () => {
    // Si alguien lo sube, que sea una decisión consciente y no un descuido.
    expect(MAXIMO_POR_VENTANA).toBeLessThanOrEqual(3);
  });
});
