'use client';

// =============================================================================
// Indicador de conexión con Meta
// =============================================================================
//
// Consulta la Graph API de verdad, no se limita a mirar que las variables
// existan: un token presente pero caducado pasaría esa comprobación y fallaría
// en el primer envío. La diferencia entre "configurado" y "funciona" es
// exactamente lo que este indicador tiene que enseñar.
//
// Se carga al montar y no en el servidor porque es una llamada externa que
// puede tardar: bloquear el render de la bandeja por consultar a Meta dejaría
// la pantalla en blanco mientras responde.

import { useEffect, useState, useTransition } from 'react';
import { estadoConexion } from '@/lib/acciones/whatsapp';

type Estado =
  | { fase: 'consultando' }
  | { fase: 'conectado'; numero: string; nombre: string; calidad: string | null }
  | { fase: 'error'; motivo: string };

/** Calidad del número según Meta. Es lo que precede a una limitación. */
const CALIDAD: Record<string, { texto: string; clase: string }> = {
  GREEN: { texto: 'calidad alta', clase: 'text-green-400' },
  YELLOW: { texto: 'calidad media', clase: 'text-amber-400' },
  RED: { texto: 'calidad baja — riesgo de limitación', clase: 'text-red-400' },
};

export function EstadoWhatsApp({ puedeVer }: { puedeVer: boolean }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'consultando' });
  const [enCurso, iniciar] = useTransition();

  function comprobar() {
    iniciar(async () => {
      const r = await estadoConexion();
      if (!r.ok || !r.datos) {
        setEstado({ fase: 'error', motivo: r.error ?? 'No se pudo comprobar' });
        return;
      }
      setEstado(
        r.datos.conectado
          ? { fase: 'conectado', numero: r.datos.numero, nombre: r.datos.nombre, calidad: r.datos.calidad }
          : { fase: 'error', motivo: r.datos.motivo }
      );
    });
  }

  useEffect(() => {
    if (puedeVer) comprobar();
    // Solo al montar: reconsultar en cada render dispararía una llamada a Meta
    // por cada cambio de estado de la pantalla.
  }, [puedeVer]);

  if (!puedeVer) return null;

  if (estado.fase === 'consultando') {
    return (
      <p className="texto-suave mt-2 text-xs">Comprobando la conexión con Meta…</p>
    );
  }

  if (estado.fase === 'error') {
    return (
      <div
        role="alert"
        className="mt-2 rounded-md border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="font-semibold">WhatsApp desconectado.</strong> {estado.motivo}
          </span>
          <button
            type="button" onClick={comprobar} disabled={enCurso}
            className="rounded border border-red-700/50 px-2 py-1 text-xs hover:bg-red-950/50 disabled:opacity-50"
          >
            {enCurso ? 'Comprobando…' : 'Reintentar'}
          </button>
        </div>
        <p className="mt-1.5 text-xs opacity-80">
          Sin conexión no se envía nada, pero los mensajes entrantes sí se siguen guardando
          si el webhook está dado de alta en Meta.
        </p>
      </div>
    );
  }

  const calidad = estado.calidad ? CALIDAD[estado.calidad] : null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-green-700/50 bg-green-950/20 px-4 py-2.5 text-sm text-green-200">
      <span className="font-semibold">WhatsApp conectado</span>
      <span className="cifras text-xs opacity-90">{estado.numero}</span>
      <span className="text-xs opacity-80">{estado.nombre}</span>
      {calidad && <span className={`text-xs ${calidad.clase}`}>· {calidad.texto}</span>}
      <button
        type="button" onClick={comprobar} disabled={enCurso}
        className="texto-suave ml-auto text-xs hover:underline disabled:opacity-50"
      >
        {enCurso ? '…' : 'recomprobar'}
      </button>
    </div>
  );
}
