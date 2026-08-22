'use client';

/**
 * Enviar un paso del embudo desde un manejador de eventos.
 *
 * El componente <Medir> cubre "esta pantalla se vio"; esto cubre "la persona
 * hizo algo". Son casos distintos: el primero va en un efecto al montar, el
 * segundo en el clic.
 *
 * Con sendBeacon, que sigue entregando aunque la navegación empiece justo
 * después — que es exactamente lo que pasa al añadir algo al carrito.
 */

import type { Evento } from '@/lib/medicion-tipos';

const CLAVE = 'bocazo:sesion-anon';

function sesionAnonima(): string {
  try {
    const ya = sessionStorage.getItem(CLAVE);
    if (ya) return ya;
    const nueva = crypto.randomUUID();
    sessionStorage.setItem(CLAVE, nueva);
    return nueva;
  } catch {
    return crypto.randomUUID();
  }
}

export function medir(evento: Evento, productoId?: string, valorCOP?: number): void {
  try {
    const cuerpo = JSON.stringify({
      evento,
      sesion: sesionAnonima(),
      ...(productoId ? { productoId } : {}),
      ...(valorCOP ? { valorCOP } : {}),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/medicion', new Blob([cuerpo], { type: 'application/json' }));
    } else {
      void fetch('/api/medicion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: cuerpo,
        keepalive: true,
      });
    }
  } catch {
    // Medir nunca puede molestar.
  }
}
