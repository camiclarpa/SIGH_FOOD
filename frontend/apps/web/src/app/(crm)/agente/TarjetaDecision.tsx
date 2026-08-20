'use client';

// =============================================================================
// Tarjeta de decisión sobre una solicitud del agente
// =============================================================================
//
// Tres salidas, no dos. "Modificar" es el caso más común en la práctica: la
// propuesta es razonable pero el descuento es excesivo o el mensaje no suena a
// la marca. Sin esa opción, la única salida sería rechazar y rehacerlo a mano,
// y el agente nunca sabría que casi acertó.

import { useState, useTransition } from 'react';
import { aprobarSolicitud, modificarSolicitud, rechazarSolicitud } from '@/lib/acciones/agente';

interface Solicitud {
  id: string;
  accion: string;
  datos: Record<string, unknown> | null;
  creada: string;
  expira: string | null;
}

export function TarjetaDecision({
  solicitud,
  puedeAprobar,
}: {
  solicitud: Solicitud;
  puedeAprobar: boolean;
}) {
  const [modo, setModo] = useState<'ver' | 'rechazar' | 'modificar'>('ver');
  const [texto, setTexto] = useState('');
  const [json, setJson] = useState(() => JSON.stringify(solicitud.datos ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  function aprobar() {
    iniciar(async () => {
      const r = await aprobarSolicitud({ id: solicitud.id });
      if (!r.ok) setError(r.error ?? 'No se pudo aprobar');
    });
  }

  function rechazar() {
    iniciar(async () => {
      const r = await rechazarSolicitud({ id: solicitud.id, motivo: texto });
      if (r.ok) { setModo('ver'); setTexto(''); setError(null); }
      else setError(r.error ?? 'No se pudo rechazar');
    });
  }

  function modificar() {
    let cambios: Record<string, unknown>;
    try {
      cambios = JSON.parse(json);
    } catch {
      // Se valida aquí antes de enviarlo: un JSON roto no debe llegar al
      // servidor para volver con un error genérico.
      setError('Los datos modificados no son un JSON válido');
      return;
    }

    iniciar(async () => {
      const r = await modificarSolicitud({ id: solicitud.id, cambios, nota: texto });
      if (r.ok) { setModo('ver'); setTexto(''); setError(null); }
      else setError(r.error ?? 'No se pudo modificar');
    });
  }

  const caducada = solicitud.expira ? new Date(solicitud.expira) < new Date() : false;

  return (
    <li className="superficie rounded-lg border borde-tema p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{solicitud.accion.replace(/_/g, ' ')}</p>
          <p className="texto-suave text-xs">
            Solicitada {solicitud.creada}
            {caducada && <span className="ml-2 text-amber-400">· caducada</span>}
          </p>
        </div>
      </div>

      {solicitud.datos && (
        <pre className="texto-suave mt-3 max-h-40 overflow-auto rounded border borde-tema p-3 text-xs">
          {JSON.stringify(solicitud.datos, null, 2)}
        </pre>
      )}

      {!puedeAprobar ? (
        <p className="texto-suave mt-3 text-xs">
          Tu rol no permite resolver solicitudes del agente.
        </p>
      ) : modo === 'ver' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button" onClick={aprobar} disabled={enCurso}
            className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
          >
            Aprobar
          </button>
          <button
            type="button" onClick={() => { setModo('modificar'); setError(null); }} disabled={enCurso}
            className="rounded-md border borde-tema px-4 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Modificar
          </button>
          <button
            type="button" onClick={() => { setModo('rechazar'); setError(null); }} disabled={enCurso}
            className="rounded-md border border-red-700/50 px-4 py-1.5 text-sm text-red-300 hover:bg-red-950/30"
          >
            Rechazar
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {modo === 'modificar' && (
            <div>
              <label className="texto-suave mb-1 block text-xs font-medium" htmlFor={`json-${solicitud.id}`}>
                Datos corregidos
              </label>
              <textarea
                id={`json-${solicitud.id}`}
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={6}
                spellCheck={false}
                className="superficie cifras w-full rounded-md border borde-tema px-3 py-2 text-xs"
              />
            </div>
          )}

          <div>
            <label className="texto-suave mb-1 block text-xs font-medium" htmlFor={`nota-${solicitud.id}`}>
              {modo === 'rechazar' ? 'Por qué se rechaza' : 'Qué has cambiado'}
            </label>
            <input
              id={`nota-${solicitud.id}`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={modo === 'rechazar' ? 'El descuento es excesivo' : 'Bajado el descuento al 10%'}
              className="superficie w-full rounded-md border borde-tema px-3 py-2 text-sm"
            />
            {/* El motivo es lo único que el agente puede aprender de esto. */}
            <p className="texto-suave mt-1 text-xs">
              Queda registrado: es lo que permite al agente corregirse.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={modo === 'rechazar' ? rechazar : modificar}
              disabled={enCurso || !texto.trim()}
              className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {enCurso ? 'Guardando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => { setModo('ver'); setError(null); }}
              className="rounded-md border borde-tema px-4 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}
    </li>
  );
}
