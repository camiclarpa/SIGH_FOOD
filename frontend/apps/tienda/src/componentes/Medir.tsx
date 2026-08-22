'use client';

/**
 * ============================================================================
 * Telemetría del embudo
 * ============================================================================
 *
 * Manda un paso del embudo al servidor. Sin píxel de terceros: los datos van a
 * la misma base donde están los pedidos, no a Meta ni a Google.
 *
 * Usa sendBeacon cuando existe. Es la diferencia entre medir el abandono y no
 * medirlo: un fetch normal se cancela al cerrar la pestaña, que es exactamente
 * el momento que más interesa registrar. sendBeacon lo entrega igual.
 *
 * La sesión anónima es un identificador de navegador, no una persona. Se guarda
 * en sessionStorage y no en localStorage: muere al cerrar la pestaña, así que
 * no sigue a nadie entre visitas.
 */

import { useEffect } from 'react';
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
    // Sin sessionStorage se genera uno por visita: se pierde la continuidad
    // dentro de la sesión, pero se sigue midiendo el total de cada paso.
    return crypto.randomUUID();
  }
}

export default function Medir({
  evento,
  productoId,
  valorCOP,
  qrToken,
}: {
  evento: Evento;
  productoId?: string;
  valorCOP?: number;
  /** QR de origen: convierte un lote de adhesivos en una campaña medible. */
  qrToken?: string;
}) {
  useEffect(() => {
    const cuerpo = JSON.stringify({
      evento,
      sesion: sesionAnonima(),
      ...(productoId ? { productoId } : {}),
      ...(valorCOP ? { valorCOP } : {}),
      ...(qrToken ? { qrToken } : {}),
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/medicion', new Blob([cuerpo], { type: 'application/json' }));
      } else {
        // keepalive hace lo mismo que sendBeacon en navegadores que no lo tienen.
        void fetch('/api/medicion', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: cuerpo,
          keepalive: true,
        });
      }
    } catch {
      // Medir nunca puede molestar: si falla, se pierde un dato y ya.
    }
  }, [evento, productoId, valorCOP, qrToken]);

  return null;
}
