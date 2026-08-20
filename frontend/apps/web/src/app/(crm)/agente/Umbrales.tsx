'use client';

// =============================================================================
// Calibración de los umbrales del agente
// =============================================================================
//
// Cada control muestra qué pasa si se sube y qué si se baja. Un slider sin esa
// explicación invita a moverlo a ojo, y estos números deciden a quién se
// persigue y a quién se da por perdido.

import { useState, useTransition } from 'react';
import { guardarUmbral, restablecerUmbral } from '@/lib/acciones/agente';
import { UMBRALES, type ClaveUmbral } from '@/lib/umbrales';

export function Umbrales({
  valores,
  puedeCalibrar,
}: {
  valores: Record<string, number>;
  puedeCalibrar: boolean;
}) {
  return (
    <div className="space-y-6">
      {!puedeCalibrar && (
        <p className="texto-suave text-sm">
          Solo un administrador puede calibrar el agente. Estos son los valores en uso.
        </p>
      )}

      {UMBRALES.map((u) => (
        <ControlUmbral
          key={u.clave}
          definicion={u}
          valor={valores[u.clave] ?? u.porDefecto}
          puedeCalibrar={puedeCalibrar}
        />
      ))}
    </div>
  );
}

function ControlUmbral({
  definicion,
  valor,
  puedeCalibrar,
}: {
  definicion: (typeof UMBRALES)[number];
  valor: number;
  puedeCalibrar: boolean;
}) {
  // Estado local para que el número siga al dedo mientras se arrastra; solo se
  // guarda al soltar, o serían decenas de escrituras por gesto.
  const [actual, setActual] = useState(valor);
  const [estado, setEstado] = useState<'quieto' | 'guardado' | 'error'>('quieto');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const cambiado = actual !== definicion.porDefecto;

  function guardar(v: number) {
    iniciar(async () => {
      const r = await guardarUmbral({ clave: definicion.clave as ClaveUmbral, valor: v });
      if (r.ok) { setEstado('guardado'); setMensaje(null); }
      else { setEstado('error'); setMensaje(r.error ?? 'No se pudo guardar'); }
    });
  }

  function restablecer() {
    iniciar(async () => {
      const r = await restablecerUmbral(definicion.clave as ClaveUmbral);
      if (r.ok) { setActual(definicion.porDefecto); setEstado('guardado'); setMensaje(null); }
      else { setEstado('error'); setMensaje(r.error ?? 'No se pudo restablecer'); }
    });
  }

  // Los decimales se pintan con dos cifras; los enteros, sin coma.
  const formatear = (v: number) => (definicion.paso < 1 ? v.toFixed(2) : String(v));

  return (
    <div className="border-b borde-tema pb-5 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={definicion.clave} className="text-sm font-medium">
          {definicion.etiqueta}
        </label>
        <div className="flex items-center gap-2">
          <span className="cifras text-lg font-semibold text-orange-500">
            {formatear(actual)}
            {definicion.unidad && <span className="texto-suave ml-1 text-xs">{definicion.unidad}</span>}
          </span>
          {cambiado && puedeCalibrar && (
            <button
              type="button"
              onClick={restablecer}
              disabled={enCurso}
              className="texto-suave text-xs hover:underline"
              title={`Valor de diseño: ${formatear(definicion.porDefecto)}`}
            >
              restablecer
            </button>
          )}
        </div>
      </div>

      <p className="texto-suave mt-1 text-xs">{definicion.descripcion}</p>

      <input
        id={definicion.clave}
        type="range"
        min={definicion.min}
        max={definicion.max}
        step={definicion.paso}
        value={actual}
        disabled={!puedeCalibrar || enCurso}
        onChange={(e) => { setActual(Number(e.target.value)); setEstado('quieto'); }}
        // Solo al soltar: onChange dispara en cada píxel del arrastre.
        onPointerUp={(e) => puedeCalibrar && guardar(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => puedeCalibrar && guardar(Number((e.target as HTMLInputElement).value))}
        className="mt-3 w-full accent-orange-500 disabled:opacity-50"
      />

      <div className="texto-suave flex justify-between text-xs">
        <span>{formatear(definicion.min)}</span>
        <span>
          diseño: {formatear(definicion.porDefecto)}
        </span>
        <span>{formatear(definicion.max)}</span>
      </div>

      <p className="texto-suave mt-2 text-xs leading-relaxed">{definicion.efecto}</p>

      {estado === 'guardado' && <p className="mt-1 text-xs text-green-400">Guardado</p>}
      {estado === 'error' && mensaje && <p className="mt-1 text-xs text-red-400">{mensaje}</p>}
    </div>
  );
}
