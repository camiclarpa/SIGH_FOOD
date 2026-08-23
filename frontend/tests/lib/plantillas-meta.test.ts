// =============================================================================
// Regla de activación de una campaña de WhatsApp
// =============================================================================
//
// La regla que se prueba aquí evita el fallo más caro de este módulo: una
// campaña que se deja activar, aparece como "activa" en la pantalla, y no manda
// un solo mensaje. Fuera de la ventana de 24 h la Cloud API de Meta solo
// entrega plantillas aprobadas, así que sin su nombre no hay envío — y sin este
// aviso nadie se entera hasta revisar por qué nadie contesta.

import { describe, it, expect } from 'vitest';
import { motivoNoEnviable, VARIABLES } from '../../apps/web/src/lib/plantillas';

describe('motivoNoEnviable', () => {
  /*
    LA REGLA CAMBIÓ, Y ESTAS PRUEBAS LO REFLEJAN.

    Antes una secuencia de WhatsApp sin plantilla aprobada en Meta no se dejaba
    activar, y era correcto: fuera de la ventana de 24 h la Cloud API no entrega
    nada más.

    Con Web Push dejó de serlo. Una campaña sin plantilla de Meta sale igual por
    notificación, y seguir exigiéndola bloqueaba justo el contenido que Meta NO
    deja mandar —bienvenidas, encuestas, reactivaciones—: las de categoría
    MARKETING, que se cobran y sin tarjeta fallan con el error 131042.

    Lo imprescindible ahora es el TEXTO: es lo que se lee en la notificación.
  */

  it('deja activar una secuencia sin plantilla de Meta', () => {
    // Saldrá por Web Push. Antes esto devolvía un motivo y bloqueaba la campaña.
    expect(
      motivoNoEnviable({ channel: 'whatsapp', template: 'Hola {{nombre}}', metaTemplateName: null })
    ).toBeNull();
  });

  it('impide activar una secuencia sin texto', () => {
    const motivo = motivoNoEnviable({ channel: 'whatsapp', template: '' });
    expect(motivo).toBeTruthy();
    // El mensaje llega tal cual a la interfaz: tiene que decir qué falta, no
    // solo negarse.
    expect(motivo).toMatch(/texto/i);
  });

  it('un texto en blanco tampoco vale', () => {
    expect(motivoNoEnviable({ channel: 'whatsapp', template: '   ' })).toBeTruthy();
  });

  it('deja activar cuando hay texto y plantilla', () => {
    expect(
      motivoNoEnviable({
        channel: 'whatsapp',
        template: 'Hola {{nombre}}',
        metaTemplateName: 'bocazo_bienvenida',
      })
    ).toBeNull();
  });

  it('los demás canales también necesitan texto', () => {
    // Antes se les eximía de la regla entera porque no pasaban por Meta. Pero
    // una notificación sin texto no tiene nada que mostrar.
    for (const canal of ['email', 'sms', 'push']) {
      expect(motivoNoEnviable({ channel: canal, template: '' })).toBeTruthy();
      expect(motivoNoEnviable({ channel: canal, template: 'Hola' })).toBeNull();
    }
  });

  it('rechaza huecos que no son variables del CRM', () => {
    const motivo = motivoNoEnviable({
      channel: 'whatsapp',
      template: 'Hola {{nombre}}',
      metaTemplateName: 'bocazo_bienvenida',
      metaTemplateVars: ['nombre', 'descuento'],
    });
    expect(motivo).toContain('descuento');
    // 'nombre' sí existe: no debe aparecer señalado como problema.
    expect(motivo).not.toMatch(/nombre.*no son variables/);
  });

  it('acepta cualquier variable declarada del CRM como hueco', () => {
    expect(
      motivoNoEnviable({
        channel: 'whatsapp',
        template: 'Hola {{nombre}}',
        metaTemplateName: 'bocazo_bienvenida',
        metaTemplateVars: VARIABLES.map((v) => v.clave),
      })
    ).toBeNull();
  });

  it('acepta una plantilla sin huecos', () => {
    expect(
      motivoNoEnviable({
        channel: 'whatsapp',
        template: 'Tu pedido va en camino',
        metaTemplateName: 'bocazo_aviso',
        metaTemplateVars: [],
      })
    ).toBeNull();
  });
});
