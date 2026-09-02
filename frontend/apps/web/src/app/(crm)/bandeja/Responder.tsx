'use client';

// =============================================================================
// Responder desde la bandeja
// =============================================================================
//
// La ventana de 24 h manda sobre todo lo que hay aquí. Cerrada, el campo se
// bloquea y se explica por qué: dejar escribir para que Meta rechace el envío
// con un 131047 gasta la paciencia del asesor y deteriora la calidad del número.

import { useEffect, useState, useTransition } from 'react';
import { responderChat, tomarChat, cerrarChat, enviarPushReactivacion } from '@/lib/acciones/whatsapp';
import { sugerirRespuesta } from '@/lib/acciones/agente';

export function Responder({
  conversationId,
  ventanaExpiraEn,
  /** Horas restantes calculadas en el servidor, o null si ya estaba cerrada. */
  restanteInicial,
  estado,
  puedeResponder,
  /** Solo tiene sentido reactivar a quien ya está registrado como comensal. */
  tieneComensal,
}: {
  conversationId: string;
  ventanaExpiraEn: string | null;
  restanteInicial: number | null;
  estado: string;
  puedeResponder: boolean;
  tieneComensal: boolean;
}) {
  const [reactivando, setReactivando] = useState(false);
  const [avisoReactivacion, setAvisoReactivacion] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  function reactivar() {
    setReactivando(true);
    setAvisoReactivacion(null);
    void enviarPushReactivacion(conversationId)
      .then((r) => {
        setAvisoReactivacion(
          r.ok
            ? { tipo: 'ok', texto: `Notificación enviada a ${r.datos?.entregados} dispositivo(s).` }
            : { tipo: 'error', texto: r.error ?? 'No se pudo enviar' }
        );
      })
      .finally(() => setReactivando(false));
  }
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  /*
    Borrador de la IA.

    Se escribe en el MISMO campo de texto en lugar de en un panel aparte con un
    botón de "usar". Es deliberado: en un panel aparte lo normal es aceptarlo
    tal cual, y el borrador puede traer un hueco entre corchetes o un dato que
    haya que corregir. Cayendo en el campo, editarlo es el camino natural y
    enviarlo requiere el mismo gesto de siempre.
  */
  const [pensando, setPensando] = useState(false);
  const [origenBorrador, setOrigenBorrador] = useState<string[] | null>(null);

  function pedirBorrador() {
    setPensando(true);
    setError(null);
    setOrigenBorrador(null);

    // Fuera de useTransition: esto tarda segundos y necesita su propio
    // indicador, no el mismo que bloquea el botón de enviar.
    void sugerirRespuesta(conversationId)
      .then((r) => {
        if (r.ok && r.datos) {
          setTexto(r.datos.texto);
          setOrigenBorrador(r.datos.contexto);
        } else {
          setError(r.error ?? 'No se pudo redactar el borrador');
        }
      })
      .finally(() => setPensando(false));
  }

  /**
   * Horas que quedan de ventana, o null si está cerrada.
   *
   * El valor inicial viene del servidor: `Date.now()` durante el render es
   * impuro y React lo prohíbe. El intervalo solo lo va bajando, para que la
   * ventana se cierre sola en una pestaña que lleve horas abierta — sin eso, el
   * asesor vería el campo activo y descubriría el cierre con el rechazo de Meta.
   */
  const [restante, setRestante] = useState<number | null>(restanteInicial);

  useEffect(() => {
    if (!ventanaExpiraEn) return;

    // Cada minuto basta: la ventana dura 24 horas. No se calcula aquí de
    // entrada porque el servidor ya dio el valor con el que se pintó.
    const id = setInterval(() => {
      const ms = new Date(ventanaExpiraEn).getTime() - Date.now();
      setRestante(ms > 0 ? Math.floor(ms / 3_600_000) : null);
    }, 60_000);

    return () => clearInterval(id);
  }, [ventanaExpiraEn]);

  const abierta = restante !== null;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;

    iniciar(async () => {
      const r = await responderChat({ conversationId, texto });
      if (r.ok) { setTexto(''); setError(null); }
      else setError(r.error ?? 'No se pudo enviar');
    });
  }

  function alternarTomar() {
    iniciar(async () => {
      const r = await tomarChat({ conversationId, tomar: estado !== 'humano' });
      setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
    });
  }

  function alternarCerrado() {
    iniciar(async () => {
      const r = await cerrarChat({ conversationId, cerrar: estado !== 'cerrada' });
      setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
    });
  }

  if (!puedeResponder) {
    return <p className="texto-suave text-sm">Tu rol no permite responder conversaciones.</p>;
  }

  return (
    <div className="border-t borde-tema pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={alternarTomar}
          disabled={enCurso}
          className={`rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
            estado === 'humano'
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'border borde-tema hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {estado === 'humano' ? 'Lo llevas tú · soltar' : 'Tomar el chat'}
        </button>

        <button
          type="button"
          onClick={alternarCerrado}
          disabled={enCurso}
          className="rounded-md border borde-tema px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
        >
          {estado === 'cerrada' ? 'Reabrir' : 'Cerrar conversación'}
        </button>

        {abierta ? (
          <span className="texto-suave text-xs">
            Ventana abierta · quedan {restante} h
          </span>
        ) : (
          <span className="text-xs text-amber-500">Ventana cerrada</span>
        )}
      </div>

      {abierta ? (
        <>
          <form onSubmit={enviar} className="flex gap-2">
            <input
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setError(null); }}
              placeholder="Escribe tu respuesta"
              maxLength={4096}
              className="superficie min-w-0 flex-1 rounded-md border borde-tema px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={pedirBorrador}
              disabled={pensando || enCurso}
              title="Redacta un borrador con el historial del cliente. No envía nada."
              className="shrink-0 rounded-md border borde-tema px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {pensando ? 'Redactando…' : 'Sugerir'}
            </button>
            <button
              type="submit"
              disabled={enCurso || pensando || !texto.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {enCurso ? 'Enviando…' : 'Enviar'}
            </button>
          </form>

          {/*
            Con qué información se redactó.

            Se enseña porque un borrador que cita el último pedido es útil solo
            si ese pedido es el correcto: sin ver el contexto, quien revisa no
            puede distinguir un dato bueno de uno viejo.
          */}
          {origenBorrador && (
            <div className="texto-suave mt-2 space-y-0.5 text-xs">
              <p className="font-medium">Borrador redactado con:</p>
              {origenBorrador.map((linea) => (
                <p key={linea} className="cifras truncate">· {linea}</p>
              ))}
              <p className="italic">Revísalo antes de enviar: no se manda nada hasta que pulses Enviar.</p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-md border border-amber-700/50 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-200">
          <strong className="font-semibold">No se puede escribir texto libre.</strong>{' '}
          Meta solo lo permite si el comensal escribió en las últimas 24 horas. Pasado ese
          plazo hay que usar una plantilla aprobada, desde Mensajería.

          {tieneComensal && (
            <div className="mt-2 border-t border-amber-700/40 pt-2">
              <button
                type="button"
                onClick={reactivar}
                disabled={reactivando}
                className="rounded-md border border-amber-600 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-900/30 disabled:opacity-50"
              >
                {reactivando ? 'Enviando…' : 'Enviar push de reactivación'}
              </button>
              <p className="mt-1 text-[11px] opacity-80">
                Gratis, va a la tienda instalada en su móvil. Si contesta ahí y vuelve a
                escribir por WhatsApp, la ventana se abre sola de nuevo.
              </p>
              {avisoReactivacion && (
                <p className={`mt-1 text-[11px] ${avisoReactivacion.tipo === 'ok' ? 'text-green-300' : 'text-red-300'}`}>
                  {avisoReactivacion.texto}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
