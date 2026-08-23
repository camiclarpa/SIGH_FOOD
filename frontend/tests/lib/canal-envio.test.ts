// =============================================================================
// El candado que impide volver a caer en el 131042
// =============================================================================
//
// El error 131042 de Meta ocurre al ENVIAR, no antes: la plantilla está
// aprobada, la secuencia parece correcta, y el mensaje simplemente no sale. En
// esta cuenta pasó de verdad —`bocazo_bienvenida_puntos` está clasificada como
// MARKETING— y la campaña de bienvenida llevaba semanas sin llegar a nadie.
//
// Lo que se comprueba aquí es que ese envío ya no se llega a intentar, y que la
// decisión de canal prefiere siempre lo gratuito.

import { describe, it, expect } from 'vitest';
import { puedeSalirPorWhatsapp, CATEGORIAS_ENVIABLES } from '../../apps/web/src/lib/canal-tipos';

describe('qué puede salir por WhatsApp', () => {
  it('bloquea marketing', () => {
    // La regla entera del archivo, en una línea.
    expect(puedeSalirPorWhatsapp('marketing')).toBe(false);
  });

  it('permite utilidad', () => {
    // Avisos de pedido: entran en la cuota gratuita de Meta.
    expect(puedeSalirPorWhatsapp('utilidad')).toBe(true);
  });

  it('permite autenticación', () => {
    // Los códigos de acceso no tienen alternativa: si no llegan, la persona no
    // puede entrar a su cuenta. Y también son gratuitos.
    expect(puedeSalirPorWhatsapp('autenticacion')).toBe(true);
  });

  it('bloquea lo que no se ha averiguado', () => {
    // null = todavía no se ha sincronizado con Meta. Suponer que es utilidad es
    // exactamente el error que produce el 131042: falla del lado seguro.
    expect(puedeSalirPorWhatsapp(null)).toBe(false);
  });

  it('la lista de categorías enviables no incluye marketing', () => {
    // Por si alguien añade una categoría nueva a la lista sin pensarlo.
    expect(CATEGORIAS_ENVIABLES).not.toContain('marketing');
    expect([...CATEGORIAS_ENVIABLES].sort()).toEqual(['autenticacion', 'utilidad']);
  });
});
