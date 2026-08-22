// =============================================================================
// La URL del checkout de Wompi
// =============================================================================
//
// Este archivo existe por un fallo concreto que llegó a estar desplegado.
//
// La URL se armaba con URLSearchParams, que codifica los dos puntos del NOMBRE
// del parámetro: `signature:integrity` salía como `signature%3Aintegrity`.
// Wompi lee la cadena de consulta en crudo y busca el nombre literal, así que
// no reconocía ninguno de los dos parámetros con dos puntos.
//
// Lo grave no es que fallara: es que NO fallaba de forma visible. El checkout
// cargaba igual, pero sin firma reconocida Wompi ignoraba también el importe y
// presentaba un campo de monto EDITABLE. Cualquiera podía pagar mil pesos por
// un pedido de treinta y dos mil.
//
// Se comprobó abriendo las dos URLs contra la cuenta real:
//   · con %3A  → campo de importe vacío y editable
//   · con  :   → "$32.000", en solo lectura
//
// De ahí que estas comprobaciones sean sobre la forma EXACTA de la cadena y no
// sobre lo que devuelva un parseador: un parseador normaliza %3A a ':' y daría
// verde sobre la versión rota.

import { describe, it, expect } from 'vitest';
import { aCentavos, aPesos, urlCheckout } from '../../apps/tienda/src/lib/wompi';

const CONFIG = {
  llavePublica: 'pub_test_abc123',
  secretoIntegridad: 'test_integrity_x',
  secretoEventos: 'test_events_x',
  pruebas: true,
  urlCheckout: 'https://checkout.wompi.co/p/',
};

const BASE = {
  config: CONFIG,
  referencia: 'BZ-ABC123-def45678',
  montoCentavos: 3_200_000,
  firma: 'a'.repeat(64),
  urlRetorno: 'https://tienda.example.com/pedido/BZ-ABC123',
};

describe('urlCheckout', () => {
  it('deja los dos puntos LITERALES en signature:integrity', () => {
    const url = urlCheckout(BASE);
    expect(url).toContain('signature:integrity=');
    // La comprobación que de verdad importa: que NO esté codificado.
    expect(url).not.toContain('signature%3Aintegrity');
    expect(url).not.toContain('signature%3aintegrity');
  });

  it('deja los dos puntos literales también en customer-data', () => {
    const url = urlCheckout({ ...BASE, nombre: 'Ana', telefono: '573001234567' });
    expect(url).toContain('customer-data:full-name=');
    expect(url).toContain('customer-data:phone-number=');
    expect(url).not.toContain('customer-data%3A');
  });

  it('manda el importe en centavos', () => {
    expect(urlCheckout(BASE)).toContain('amount-in-cents=3200000');
  });

  it('SÍ codifica los valores', () => {
    const url = urlCheckout(BASE);
    // La URL de retorno lleva ':' y '/' propios: sin codificar romperían la
    // cadena de consulta.
    expect(url).toContain('redirect-url=https%3A%2F%2F');
    expect(url).not.toContain('redirect-url=https://');
  });

  it('codifica el + del prefijo telefónico', () => {
    // Un '+' sin codificar se lee como espacio, y Wompi recibiría " 57".
    const url = urlCheckout({ ...BASE, telefono: '573001234567' });
    expect(url).toContain('phone-number-prefix=%2B57');
  });

  it('quita el 57 del número, que ya va en el prefijo', () => {
    const url = urlCheckout({ ...BASE, telefono: '573001234567' });
    expect(url).toContain('customer-data:phone-number=3001234567');
  });

  it('omite los datos del cliente si no se dan', () => {
    const url = urlCheckout(BASE);
    expect(url).not.toContain('customer-data');
  });

  it('lleva todos los parámetros que Wompi exige', () => {
    const url = urlCheckout(BASE);
    for (const p of ['public-key=', 'currency=COP', 'amount-in-cents=', 'reference=', 'signature:integrity=', 'redirect-url=']) {
      expect(url, p).toContain(p);
    }
  });
});

describe('conversión de importes', () => {
  it('pesos a centavos multiplica por cien', () => {
    // Equivocarse aquí no da un error: da un cobro cien veces mayor o menor, y
    // eso se descubre cuadrando caja.
    expect(aCentavos(32_000)).toBe(3_200_000);
    expect(aCentavos(1)).toBe(100);
  });

  it('y la vuelta es exacta', () => {
    for (const pesos of [1, 32_000, 139_900, 6_000]) {
      expect(aPesos(aCentavos(pesos))).toBe(pesos);
    }
  });

  it('redondea en lugar de truncar', () => {
    expect(aCentavos(0.005)).toBe(1);
  });
});
