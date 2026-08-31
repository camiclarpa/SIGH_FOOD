'use client';

// =============================================================================
// Formulario de captura en mesa
// =============================================================================
//
// Se llama directamente a /api/moments/scan, que ya existe y ya hace todo:
// valida el QR, crea o encuentra al comensal, registra el momento y el
// consentimiento, y devuelve puntos, insignias y nivel. Aquí solo se recogen
// los datos y se celebra el resultado.

import { useEffect, useState } from 'react';
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
      // Para la pregunta de maridaje, que se hace DESPUÉS de celebrar los
      // puntos y sin bloquear nada si no responde.
      momentId: string | null;
    };

/** Con qué se puede acompañar. Un solo toque, sin escribir nada. */
const MARIDAJES = [
  { valor: 'cerveza', etiqueta: 'Cerveza', icono: '🍺' },
  { valor: 'vino', etiqueta: 'Vino', icono: '🍷' },
  { valor: 'cafe', etiqueta: 'Café', icono: '☕' },
  { valor: 'solo', etiqueta: 'Solo', icono: '🌶' },
] as const;

/**
 * "¿Con qué lo estás disfrutando?" — un solo toque, tras el registro.
 *
 * Va como pregunta aparte y no como parte del formulario principal porque
 * responderla lleva tiempo de decisión que el envío del momento no puede
 * esperar: la persona quiere ver sus puntos YA, y esto se pregunta después,
 * sin bloquear nada si no contesta.
 */
function PreguntaMaridaje({
  momentId,
  consumerId,
  lineaProducto,
}: {
  momentId: string;
  consumerId: string | null;
  lineaProducto: string | null;
}) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  /*
    Sugerencia de la IA, aparte del registro del momento.

    Se pide DESPUÉS de que la pantalla ya muestre los puntos ganados —esto
    puede tardar unos segundos— y en silencio si falla: sin proveedor
    configurado, o si el modelo tarda demasiado, la pregunta manual de abajo
    sigue funcionando exactamente igual que sin esto.
  */
  const [sugerencia, setSugerencia] = useState<{ bebida: string; porQue: string } | null>(null);

  useEffect(() => {
    if (!consumerId || !lineaProducto) return;
    let vigente = true;

    fetch('/api/moments/maridaje', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consumer_id: consumerId, linea: lineaProducto }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (vigente && d.ok && d.maridaje?.bebida) {
          setSugerencia({ bebida: d.maridaje.bebida, porQue: d.maridaje.porQue ?? '' });
        }
      })
      .catch(() => {
        // Silencioso: ver la nota de arriba.
      });

    return () => { vigente = false; };
  }, [consumerId, lineaProducto]);

  async function elegir(valor: string) {
    if (enviando || elegido) return;
    setElegido(valor);
    setEnviando(true);
    try {
      await fetch('/api/moments/scan', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ moment_id: momentId, maridaje: valor }),
      });
    } catch {
      // Silencioso a propósito: es una pregunta opcional sobre un momento que
      // ya quedó registrado. Un fallo de red aquí no debe alarmar a nadie.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-6 border-t borde-tema pt-5">
      {sugerencia && (
        <p className="texto-suave mb-3 text-xs">
          🤖 Prueba con <strong>{sugerencia.bebida}</strong>
          {sugerencia.porQue ? ` — ${sugerencia.porQue}` : ''}
        </p>
      )}
      <p className="texto-suave mb-3 text-sm">
        {elegido ? '¡Anotado!' : '¿Con qué lo estás disfrutando?'}
      </p>
      <div className="flex justify-center gap-2">
        {MARIDAJES.map((m) => (
          <button
            key={m.valor}
            type="button"
            onClick={() => elegir(m.valor)}
            disabled={Boolean(elegido)}
            aria-pressed={elegido === m.valor}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
              elegido === m.valor
                ? 'border-orange-500 bg-orange-500/10'
                : elegido
                  ? 'borde-tema opacity-40'
                  : 'borde-tema hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span aria-hidden className="text-xl">{m.icono}</span>
            {m.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

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
        momentId: d.data?.moment_id ?? null,
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
            es a lo que vino, y solo entonces se le pregunta el maridaje. */}
        {estado.momentId && (
          <PreguntaMaridaje
            momentId={estado.momentId}
            consumerId={estado.consumerId}
            lineaProducto={estado.lineaProducto}
          />
        )}

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
