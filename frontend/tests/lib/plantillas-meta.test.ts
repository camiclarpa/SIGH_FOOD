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
  it('impide activar una secuencia de WhatsApp sin plantilla de Meta', () => {
    const motivo = motivoNoEnviable({ channel: 'whatsapp', metaTemplateName: null });
    expect(motivo).toBeTruthy();
    // El mensaje llega tal cual a la interfaz: debe explicar la causa, no solo
    // negarse, o el usuario no sabe qué rellenar.
    expect(motivo).toMatch(/plantilla aprobada en Meta/i);
  });

  it('trata una plantilla en blanco como ausente', () => {
    expect(motivoNoEnviable({ channel: 'whatsapp', metaTemplateName: '   ' })).toBeTruthy();
  });

  it('deja activar cuando la plantilla está puesta', () => {
    expect(
      motivoNoEnviable({ channel: 'whatsapp', metaTemplateName: 'bocazo_bienvenida' })
    ).toBeNull();
  });

  it('no aplica la regla a los canales que no pasan por Meta', () => {
    for (const canal of ['email', 'sms', 'push']) {
      expect(motivoNoEnviable({ channel: canal, metaTemplateName: null })).toBeNull();
    }
  });

  it('rechaza huecos que no son variables del CRM', () => {
    const motivo = motivoNoEnviable({
      channel: 'whatsapp',
      metaTemplateName: 'bocazo_bienvenida',
      metaTemplateVars: ['nombre', 'descuento'],
    });
    expect(motivo).toContain('descuento');
    // 'nombre' sí existe: no debe aparecer señalado como problema.
    expect(motivo).not.toContain('nombre,');
  });

  it('acepta cualquier variable declarada del CRM como hueco', () => {
    expect(
      motivoNoEnviable({
        channel: 'whatsapp',
        metaTemplateName: 'bocazo_bienvenida',
        metaTemplateVars: VARIABLES.map((v) => v.clave),
      })
    ).toBeNull();
  });

  it('acepta una plantilla sin huecos', () => {
    expect(
      motivoNoEnviable({
        channel: 'whatsapp',
        metaTemplateName: 'bocazo_aviso',
        metaTemplateVars: [],
      })
    ).toBeNull();
  });
});
