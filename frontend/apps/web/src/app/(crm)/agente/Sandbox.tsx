'use client';

// =============================================================================
// Sandbox: probar el agente sin tocar a nadie
// =============================================================================
//
// Nada de lo que pasa aquí se guarda ni se envía. Ese es el punto: probar un
// cambio sobre comensales reales significa que el primer intento fallido ya
// salió por WhatsApp.

import { useState, useTransition } from 'react';
import { simularAgente } from '@/lib/acciones/agente';
import { LINEAS_PRODUCTO } from '@/lib/fidelizacion';

/** Situaciones que conviene probar antes de soltar al agente. */
const ESCENARIOS = [
  {
    nombre: 'Habitual que desapareció',
    escenario: 'Venía cada semana y lleva un mes sin aparecer.',
    perfil: { nombre: 'Andrea', momentos: 14, diasSinVenir: 31, lineaFavorita: 'spicy_volcano', puntos: 140 },
  },
  {
    nombre: 'Probó una vez y no volvió',
    escenario: 'Escaneó una sola vez hace tres semanas.',
    perfil: { nombre: 'Julián', momentos: 1, diasSinVenir: 21, lineaFavorita: 'sweet_craft', puntos: 10 },
  },
  {
    nombre: 'Activo y fiel',
    escenario: 'Escanea cada pocos días, no hay motivo para molestarlo.',
    perfil: { nombre: 'Marcela', momentos: 28, diasSinVenir: 2, lineaFavorita: 'umami_boost', puntos: 320 },
  },
  {
    nombre: 'Recién llegado',
    escenario: 'Se registró ayer con su primer momento.',
    perfil: { nombre: 'Diego', momentos: 1, diasSinVenir: 1, lineaFavorita: 'flavor_switch', puntos: 60 },
  },
];

export function Sandbox({ puedeProbar }: { puedeProbar: boolean }) {
  const [escenario, setEscenario] = useState(ESCENARIOS[0].escenario);
  const [perfil, setPerfil] = useState(ESCENARIOS[0].perfil);
  const [resultado, setResultado] = useState<{ respuesta: unknown; prompt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verPrompt, setVerPrompt] = useState(false);
  const [enCurso, iniciar] = useTransition();

  if (!puedeProbar) {
    return (
      <p className="texto-suave text-sm">
        Solo un administrador puede usar el sandbox del agente.
      </p>
    );
  }

  function cargar(i: number) {
    setEscenario(ESCENARIOS[i].escenario);
    setPerfil(ESCENARIOS[i].perfil);
    setResultado(null);
    setError(null);
  }

  function simular() {
    iniciar(async () => {
      const r = await simularAgente({ escenario, perfil });
      if (r.ok && r.datos) { setResultado(r.datos); setError(null); }
      else { setError(r.error ?? 'La simulación falló'); setResultado(null); }
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <div className="space-y-4">
      <div>
        <p className={etiqueta}>Casos preparados</p>
        <div className="flex flex-wrap gap-2">
          {ESCENARIOS.map((e, i) => (
            <button
              key={e.nombre}
              type="button"
              onClick={() => cargar(i)}
              className="texto-suave rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {e.nombre}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={etiqueta} htmlFor="escenario">Situación</label>
        <textarea
          id="escenario" value={escenario} rows={2}
          onChange={(e) => setEscenario(e.target.value)}
          className={`${campo} resize-y`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className={etiqueta} htmlFor="s-nombre">Nombre</label>
          <input
            id="s-nombre" value={perfil.nombre} className={campo}
            onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className={etiqueta} htmlFor="s-momentos">Momentos</label>
          <input
            id="s-momentos" type="number" min={0} value={perfil.momentos} className={campo}
            onChange={(e) => setPerfil({ ...perfil, momentos: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={etiqueta} htmlFor="s-dias">Días sin venir</label>
          <input
            id="s-dias" type="number" min={0} value={perfil.diasSinVenir} className={campo}
            onChange={(e) => setPerfil({ ...perfil, diasSinVenir: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={etiqueta} htmlFor="s-linea">Línea favorita</label>
          <select
            id="s-linea" value={perfil.lineaFavorita} className={campo}
            onChange={(e) => setPerfil({ ...perfil, lineaFavorita: e.target.value })}
          >
            {LINEAS_PRODUCTO.map((l) => (
              <option key={l.codigo} value={l.codigo}>{l.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={etiqueta} htmlFor="s-puntos">Puntos</label>
          <input
            id="s-puntos" type="number" min={0} value={perfil.puntos} className={campo}
            onChange={(e) => setPerfil({ ...perfil, puntos: Number(e.target.value) })}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={simular}
        disabled={enCurso}
        className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {enCurso ? 'Consultando al agente…' : 'Simular'}
      </button>

      {error && (
        <p role="alert" className="rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {resultado != null && (
        <div className="rounded-md border borde-tema p-4">
          <p className="texto-suave mb-2 text-xs font-medium uppercase tracking-wide">
            Qué haría el agente
          </p>
          <pre className="cifras max-h-64 overflow-auto text-xs">
            {JSON.stringify(resultado.respuesta, null, 2)}
          </pre>

          <button
            type="button"
            onClick={() => setVerPrompt((v) => !v)}
            className="texto-suave mt-3 text-xs hover:underline"
          >
            {verPrompt ? 'Ocultar' : 'Ver'} el prompt exacto
          </button>

          {/* Media hora de "el agente responde raro" se resuelve viendo esto. */}
          {verPrompt && (
            <pre className="texto-suave mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border borde-tema p-3 text-xs">
              {resultado.prompt}
            </pre>
          )}

          <p className="texto-suave mt-3 text-xs">
            Nada de esto se ha guardado ni enviado a nadie.
          </p>
        </div>
      )}
    </div>
  );
}
