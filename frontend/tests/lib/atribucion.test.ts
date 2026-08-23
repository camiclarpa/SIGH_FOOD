// De dónde vino quien compra.
//
// La regla que más importa aquí es la del PRIMER toque, y merece prueba propia
// porque es una decisión de negocio disfrazada de detalle técnico: si se
// guardara el último toque, quien llega por un reel y luego vuelve escribiendo
// la dirección contaría como "directo", y el informe de canales diría que la
// campaña no sirvió. Se apagaría la inversión que sí estaba funcionando.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  leerDeParametros,
  tieneAlgo,
  recordarOrigen,
  origenDeLaVisita,
} from '../../apps/tienda/src/lib/atribucion';

/** sessionStorage mínimo: el módulo solo usa getItem y setItem. */
function montarAlmacen() {
  const datos = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
      clear: () => datos.clear(),
    },
  });
  return datos;
}

describe('leer el origen de la URL', () => {
  it('saca las tres utm y el ref', () => {
    const o = leerDeParametros(
      new URLSearchParams('utm_source=instagram&utm_medium=reel&utm_campaign=lanzamiento&ref=camilo')
    );
    expect(o).toEqual({
      utmSource: 'instagram',
      utmMedium: 'reel',
      utmCampaign: 'lanzamiento',
      referidoPor: 'camilo',
    });
  });

  it('un ref sin utm_source cuenta como canal "referido"', () => {
    // Sin esto, el boca a boca no aparece en el informe de canales — y es el
    // canal más barato que hay.
    const o = leerDeParametros(new URLSearchParams('ref=ana'));
    expect(o.utmSource).toBe('referido');
    expect(o.referidoPor).toBe('ana');
  });

  it('pero no pisa un utm_source que sí venía', () => {
    const o = leerDeParametros(new URLSearchParams('utm_source=whatsapp&ref=ana'));
    expect(o.utmSource).toBe('whatsapp');
  });

  it('normaliza a minúsculas y recorta espacios', () => {
    expect(leerDeParametros(new URLSearchParams('utm_source=%20Instagram%20')).utmSource).toBe('instagram');
  });

  it('descarta lo que podría ensuciar un informe', () => {
    // La cadena de consulta la escribe cualquiera y esto acaba en una columna
    // que después se agrupa y se pinta.
    const o = leerDeParametros(new URLSearchParams('utm_source=<script>alert(1)</script>'));
    expect(o.utmSource).not.toContain('<');
    expect(o.utmSource).not.toContain('>');
  });

  it('recorta a lo que cabe en la columna', () => {
    const o = leerDeParametros(new URLSearchParams(`utm_source=${'a'.repeat(200)}`));
    expect(o.utmSource!.length).toBeLessThanOrEqual(80);
  });

  it('una URL sin parámetros no inventa nada', () => {
    const o = leerDeParametros(new URLSearchParams(''));
    expect(o).toEqual({});
    expect(tieneAlgo(o)).toBe(false);
  });

  it('un parámetro vacío tampoco cuenta', () => {
    expect(tieneAlgo(leerDeParametros(new URLSearchParams('utm_source=')))).toBe(false);
  });
});

describe('primer toque', () => {
  beforeEach(() => montarAlmacen());

  it('guarda el origen de la primera visita', () => {
    const o = recordarOrigen('?utm_source=instagram&utm_medium=reel');
    expect(o.utmSource).toBe('instagram');
    expect(origenDeLaVisita().utmSource).toBe('instagram');
  });

  it('NO lo sobrescribe cuando la persona vuelve por otro camino', () => {
    // El caso real: entra por un reel, navega, y más tarde llega directa. El
    // pedido lo trajo el reel.
    recordarOrigen('?utm_source=instagram');
    const despues = recordarOrigen('?utm_source=google');
    expect(despues.utmSource).toBe('instagram');
    expect(origenDeLaVisita().utmSource).toBe('instagram');
  });

  it('ni siquiera cuando la segunda visita llega sin parámetros', () => {
    recordarOrigen('?utm_source=instagram');
    recordarOrigen('');
    expect(origenDeLaVisita().utmSource).toBe('instagram');
  });

  it('sin origen conocido no guarda nada', () => {
    expect(recordarOrigen('')).toEqual({});
    expect(origenDeLaVisita()).toEqual({});
  });

  it('una entrada directa no bloquea una campaña posterior', () => {
    // Entrar directo no es un "primer toque": no hay canal que atribuir, así
    // que si después llega por una campaña, esa sí manda.
    recordarOrigen('');
    recordarOrigen('?utm_source=instagram');
    expect(origenDeLaVisita().utmSource).toBe('instagram');
  });
});

describe('cuando el navegador no deja guardar', () => {
  it('no revienta: medir nunca puede impedir comprar', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: () => { throw new Error('bloqueado'); },
        setItem: () => { throw new Error('bloqueado'); },
      },
    });

    expect(() => recordarOrigen('?utm_source=instagram')).not.toThrow();
    // Sigue devolviendo el origen de ESTA pantalla, aunque no persista.
    expect(recordarOrigen('?utm_source=instagram').utmSource).toBe('instagram');
    expect(origenDeLaVisita()).toEqual({});
  });
});
