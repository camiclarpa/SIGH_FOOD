// =============================================================================
// Máquina de estados de un pedido
// =============================================================================
//
// La regla que protege esto tiene consecuencias físicas: un pedido "entregado"
// que vuelve a "preparando" hace que la cocina prepare dos veces lo mismo, y un
// salto de "recibido" a "entregado" borra la comanda antes de que nadie la
// cocine.
//
// Existe además porque en la prueba contra base real este invariante estuvo
// cubierto por una aserción con `|| true` que no podía fallar. Un test que no
// puede fallar es peor que no tener test: da confianza sin darla.

import { describe, it, expect } from 'vitest';
import { siguientesDe, type EstadoPedido } from '../../apps/web/src/lib/estados-pedido';

describe('siguientesDe', () => {
  it('avanza un paso cada vez, en domicilio', () => {
    expect(siguientesDe('recibido', 'domicilio')).toContain('confirmado');
    expect(siguientesDe('confirmado', 'domicilio')).toContain('preparando');
    expect(siguientesDe('preparando', 'domicilio')).toContain('listo');
    expect(siguientesDe('listo', 'domicilio')).toContain('en_camino');
    expect(siguientesDe('en_camino', 'domicilio')).toContain('entregado');
  });

  it('nunca ofrece retroceder', () => {
    // El caso que se coló: de 'listo' no se puede volver a 'preparando'.
    expect(siguientesDe('listo', 'domicilio')).not.toContain('preparando');
    expect(siguientesDe('en_camino', 'domicilio')).not.toContain('listo');
    expect(siguientesDe('preparando', 'domicilio')).not.toContain('confirmado');
  });

  it('nunca ofrece saltarse pasos', () => {
    const desdeRecibido = siguientesDe('recibido', 'domicilio');
    expect(desdeRecibido).not.toContain('entregado');
    expect(desdeRecibido).not.toContain('listo');
    // Solo el siguiente, y cancelar.
    expect(desdeRecibido).toHaveLength(2);
  });

  it('salta "en camino" cuando el pedido es para recoger', () => {
    // Enseñar una etapa que nunca va a ocurrir hace que parezca atascado.
    const desdeListo = siguientesDe('listo', 'recoger');
    expect(desdeListo).toContain('entregado');
    expect(desdeListo).not.toContain('en_camino');
  });

  it('deja cancelar desde cualquier punto abierto', () => {
    const abiertos: EstadoPedido[] = ['recibido', 'confirmado', 'preparando', 'listo', 'en_camino'];
    for (const e of abiertos) {
      expect(siguientesDe(e, 'domicilio')).toContain('cancelado');
    }
  });

  it('un pedido cerrado no admite nada', () => {
    // Ni siquiera cancelar: lo entregado, entregado está.
    expect(siguientesDe('entregado', 'domicilio')).toEqual([]);
    expect(siguientesDe('cancelado', 'domicilio')).toEqual([]);
  });

  it('no deja un estado abierto sin salida', () => {
    // Un estado del que no se pueda salir deja el pedido atascado para siempre
    // y sin forma de arreglarlo desde la interfaz.
    const abiertos: EstadoPedido[] = ['recibido', 'confirmado', 'preparando', 'listo', 'en_camino'];
    for (const e of abiertos) {
      expect(siguientesDe(e, 'domicilio').length).toBeGreaterThan(0);
      expect(siguientesDe(e, 'recoger').length).toBeGreaterThan(0);
    }
  });
});
