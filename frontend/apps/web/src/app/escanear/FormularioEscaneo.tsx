'use client';

// =============================================================================
// Formulario de captura en mesa
// =============================================================================
//
// Se llama directamente a /api/moments/scan, que ya existe y ya hace todo:
// valida el QR, crea o encuentra al comensal, registra el momento y el
// consentimiento, y devuelve puntos, insignias y nivel. Aquí solo se recogen
// los datos y se celebra el resultado.

import { useState } from 'react';
import { RetoEnMesa } from './RetoEnMesa';

interface Linea {
  codigo: string;
  etiqueta: string;
}

type Estado =
  | { fase: 'formulario' }
  | { fase: 'enviando' }
  | { fase: 'error'; mensaje: string }
  | {
      fase: 'listo';
      puntos: number;
      insignias: Array<{ nombre: string; icono: string }>;
      nivel: string | null;
      momentos: number | null;
      // Lo que necesita el desafío que se ofrece a continuación.
      consumerId: string | null;
      accountId: string | null;
      lineaProducto: string | null;
    };

export function FormularioEscaneo({ token, lineas }: { token: string; lineas: Linea[] }) {
  const [linea, setLinea] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nombre, setNombre] = useState('');
  const [consiente, setConsiente] = useState(false);
  const [estado, setEstado] = useState<Estado>({ fase: 'formulario' });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado({ fase: 'enviando' });

    try {
      const r = await fetch('/api/moments/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          qr_token: token,
          whatsapp: whatsapp.trim(),
          full_name: nombre.trim() || undefined,
          product_line: linea,
          habeas_data: consiente,
        }),
      });

      const d = await r.json();

      if (!r.ok || !d.success) {
        setEstado({
          fase: 'error',
          mensaje: d.error ?? 'No pudimos registrar tu momento. Inténtalo otra vez.',
        });
        return;
      }

      setEstado({
        fase: 'listo',
        puntos: d.data?.puntos_ganados ?? 0,
        insignias: d.data?.insignias_nuevas ?? [],
        nivel: d.data?.nivel_nuevo ?? null,
        momentos: d.data?.momentos_totales ?? null,
        consumerId: d.data?.consumer_id ?? null,
        accountId: d.data?.account_id ?? null,
        lineaProducto: d.data?.product_line ?? null,
      });
    } catch {
      setEstado({
        fase: 'error',
        mensaje: 'Sin conexión. Comprueba tu internet e inténtalo otra vez.',
      });
    }
  }

  // --- Confirmación -----------------------------------------------------------
  if (estado.fase === 'listo') {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-semibold">¡Momento registrado!</h2>

        <p className="cifras mt-4 text-4xl font-bold text-orange-500">+{estado.puntos}</p>
        <p className="texto-suave text-sm">puntos ganados</p>

        {estado.insignias.length > 0 && (
          <div className="mt-6">
            <p className="texto-suave text-xs uppercase tracking-wide">
              Insignia{estado.insignias.length === 1 ? '' : 's'} desbloqueada
              {estado.insignias.length === 1 ? '' : 's'}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {estado.insignias.map((i) => (
                <span
                  key={i.nombre}
                  className="rounded-full border border-orange-500/50 bg-orange-500/10 px-3 py-1.5 text-sm"
                >
                  <span aria-hidden className="mr-1.5 font-bold text-orange-500">{i.icono}</span>
                  {i.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {estado.momentos !== null && (
          <p className="texto-suave mt-6 text-sm">
            Llevas {estado.momentos} momento{estado.momentos === 1 ? '' : 's'} registrado
            {estado.momentos === 1 ? '' : 's'}.
          </p>
        )}

        {/* Va DESPUÉS de la celebración: primero el comensal ve sus puntos, que
            es a lo que vino, y solo entonces se le propone algo más. */}
        {estado.consumerId && (
          <RetoEnMesa
            consumerId={estado.consumerId}
            accountId={estado.accountId}
            lineaProducto={estado.lineaProducto}
          />
        )}
      </div>
    );
  }

  const enviando = estado.fase === 'enviando';
  // El botón no se habilita hasta que hay todo lo imprescindible: es preferible
  // a dejar pulsar y responder con un error.
  const listo = linea && whatsapp.trim().length >= 8 && consiente;

  return (
    <form onSubmit={enviar} className="space-y-5">
      {/* --- Línea probada: botones grandes, no un desplegable --- */}
      <fieldset>
        <legend className="texto-suave mb-2 text-xs font-medium uppercase tracking-wide">
          Elige lo que probaste
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {lineas.map((l) => (
            <button
              key={l.codigo}
              type="button"
              onClick={() => setLinea(l.codigo)}
              aria-pressed={linea === l.codigo}
              className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                linea === l.codigo
                  ? 'border-orange-500 bg-orange-500 font-medium text-white'
                  : 'borde-tema hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {l.etiqueta}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="texto-suave mb-1 block text-xs font-medium" htmlFor="whatsapp">
          Tu WhatsApp
        </label>
        <input
          id="whatsapp"
          // `tel` abre el teclado numérico del móvil; `text` obligaría a
          // cambiarlo a mano, y esto se rellena de pie.
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+57 300 000 0000"
          required
          className="superficie cifras w-full rounded-lg border borde-tema px-4 py-3 text-base"
        />
      </div>

      <div>
        <label className="texto-suave mb-1 block text-xs font-medium" htmlFor="nombre">
          Tu nombre <span className="opacity-60">(opcional)</span>
        </label>
        <input
          id="nombre"
          autoComplete="given-name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="superficie w-full rounded-lg border borde-tema px-4 py-3 text-base"
        />
      </div>

      {/*
        Sin marcar por defecto y con el texto completo delante: un consentimiento
        premarcado no es consentimiento, y aquí se están capturando datos
        personales de una persona que acaba de conocer la marca.
      */}
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consiente}
          onChange={(e) => setConsiente(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span className="texto-suave text-xs leading-relaxed">
          Acepto que SIGH_FOOD guarde mis datos para registrar mis momentos, gestionar mis
          puntos y enviarme comunicaciones sobre el programa. Puedo revocarlo cuando quiera.
        </span>
      </label>

      {estado.fase === 'error' && (
        <p role="alert" className="rounded-lg border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={!listo || enviando}
        className="w-full rounded-lg bg-orange-600 px-4 py-4 text-base font-semibold text-white hover:bg-orange-500 disabled:opacity-40"
      >
        {enviando ? 'Registrando…' : 'Registrar y ganar puntos'}
      </button>
    </form>
  );
}
