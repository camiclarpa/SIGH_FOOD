'use client';

/**
 * ============================================================================
 * Reseña post-entrega
 * ============================================================================
 *
 * CUÁNDO SE PREGUNTA
 * ------------------
 * No al entregar. Ahí la persona acaba de recibir la bolsa y todavía no ha
 * probado nada: lo que contesta va sobre el reparto, no sobre el producto. Se
 * pregunta un rato después, y de eso se encarga el aviso automático.
 *
 * LA REGLA QUE ORDENA TODO EL FORMULARIO
 * --------------------------------------
 * La nota se guarda AL PRIMER TOQUE, siempre. Todo lo demás —atributos, lote,
 * comentario— se pide después, sobre una reseña que ya está a salvo.
 *
 * Es la diferencia entre un sistema que recoge opiniones y uno que las pierde.
 * Un formulario largo delante de las estrellas hace que la gente lo abandone a
 * la mitad, y una reseña abandonada no deja ni la nota.
 *
 * LO QUE PASA SEGÚN LA NOTA
 * -------------------------
 * Con 4 o 5 se agradece y se invita a contarlo en Google, que es donde esa
 * opinión trae a alguien nuevo. Con 3 o menos se abre el diagnóstico y se queda
 * AQUÍ: no se manda a nadie a publicar un enfado que todavía se puede resolver.
 * No es esconder la crítica —entra igual y levanta alerta— es atenderla antes
 * de que sea pública.
 */

import { useState } from 'react';

/** Motivos de un toque. Casi nadie escribe texto en el móvil. */
const MOTIVOS = [
  { id: 'temperatura', texto: 'Llegó blando' },
  { id: 'tiempo', texto: 'Tardó mucho' },
  { id: 'empaque', texto: 'El empaque' },
  { id: 'sabor', texto: 'El sabor' },
  { id: 'cantidad', texto: 'La cantidad' },
  { id: 'otro', texto: 'Otra cosa' },
] as const;

/**
 * Lo que se puntúa por separado, además de la nota global.
 *
 * Una nota de 3 estrellas no le dice nada a producción: «buenísimo pero llegó
 * blando» y «crujiente pero soso» son las mismas 3 y se arreglan en sitios
 * distintos. Cada atributo apunta a un responsable — crocancia es proceso,
 * sabor es receta, empaque es sellado, frescura es rotación.
 */
const ATRIBUTOS = [
  { id: 'crocancia', texto: 'Crocancia' },
  { id: 'sabor', texto: 'Sabor' },
  { id: 'empaque', texto: 'Empaque' },
  { id: 'frescura', texto: 'Frescura' },
] as const;

function Estrellas({
  valor,
  onCambio,
  tamano = 'grande',
  etiqueta,
}: {
  valor: number;
  onCambio: (n: number) => void;
  tamano?: 'grande' | 'pequeno';
  etiqueta: string;
}) {
  const clase = tamano === 'grande' ? 'h-14 w-14 text-3xl' : 'h-9 w-9 text-xl';
  return (
    <div className="flex gap-1" role="group" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onCambio(n)}
          aria-label={`${etiqueta}: ${n} de 5`}
          className={`flex items-center justify-center rounded-full transition-transform active:scale-95 ${clase} ${
            n <= valor ? 'text-[#d97325]' : 'text-[#4a4239]'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** Campo del código impreso en la bolsa. Es lo que da trazabilidad por tanda. */
function CampoLote({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  return (
    <div className="mt-4">
      <label htmlFor="lote" className="block text-sm text-[#c9bfb2]">
        Código del lote <span className="text-[#6b6258]">(opcional)</span>
      </label>
      <p className="mt-0.5 text-xs text-[#6b6258]">
        Está impreso en la bolsa. Nos deja saber de qué tanda vino.
      </p>
      <input
        id="lote"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        maxLength={40}
        autoCapitalize="characters"
        spellCheck={false}
        className="mt-2 w-full rounded-xl border border-white/12 bg-[#12100e] p-3 font-mono text-[#f5f1ea] placeholder:text-[#6b6258]"
        placeholder="2026-08B"
      />
    </div>
  );
}

export default function Resena({
  codigo,
  urlGoogle,
}: {
  codigo: string;
  /** Perfil de Google del negocio. Sin él no se enseña la invitación. */
  urlGoogle?: string;
}) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [motivos, setMotivos] = useState<string[]>([]);
  const [atributos, setAtributos] = useState<Record<string, number>>({});
  const [lote, setLote] = useState('');
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'listo' | 'error'>('inicio');
  const [detalleEnviado, setDetalleEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alta = nota >= 4;

  function alternarMotivo(id: string) {
    setMotivos((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  /** Guarda la reseña. Con nota alta se llama al primer toque. */
  async function enviar(puntuacion: number, conDetalle: boolean) {
    setEstado('enviando');
    setError(null);

    try {
      const r = await fetch('/api/resena', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          codigo,
          puntuacion,
          ...(conDetalle
            ? {
                comentario: comentario.trim() || undefined,
                motivos: motivos.length ? motivos : undefined,
                atributos: Object.keys(atributos).length ? atributos : undefined,
                lote: lote.trim() || undefined,
              }
            : {}),
        }),
      });
      const d = await r.json();

      if (!d.ok) {
        setError(d.error ?? 'No pudimos guardar tu reseña');
        setEstado('error');
        return;
      }
      if (conDetalle) setDetalleEnviado(true);
      setEstado('listo');
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
      setEstado('error');
    }
  }

  /**
   * Añade el detalle a una reseña que YA está guardada.
   *
   * Va por PATCH y no reenviando: la nota ya está a salvo y no se puede tocar
   * desde aquí. Si esta llamada falla, no se pierde nada de lo que ya contó.
   */
  async function ampliar() {
    try {
      await fetch('/api/resena', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          codigo,
          atributos: Object.keys(atributos).length ? atributos : undefined,
          lote: lote.trim() || undefined,
        }),
      });
    } catch {
      // Silencioso a propósito: es información extra sobre algo ya guardado, y
      // un error aquí solo serviría para preocupar por lo que no importa.
    }
    setDetalleEnviado(true);
  }

  // --- Ya está guardada ------------------------------------------------------
  if (estado === 'listo') {
    const puedeAmpliar = alta && !detalleEnviado;

    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6">
        <div className="text-center">
          <p className="text-3xl" aria-hidden>{alta ? '🌟' : '🙏'}</p>
          <p className="font-display mt-3 text-lg font-bold text-[#f5f1ea]">
            {alta ? 'Nos alegra un montón' : 'Gracias por decírnoslo'}
          </p>

          {alta ? (
            urlGoogle ? (
              <>
                <p className="mt-1 text-sm text-[#8f8479]">
                  ¿Nos ayudas a que otros nos encuentren? Contarlo en Google es lo que más
                  nos sirve.
                </p>
                <a
                  href={urlGoogle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d97325] px-6 font-semibold text-[#12100e]"
                >
                  Contarlo en Google
                </a>
              </>
            ) : (
              <p className="mt-1 text-sm text-[#8f8479]">Gracias. Nos anima a seguir.</p>
            )
          ) : (
            // Con nota baja NO se manda a Google. Y se le dice que alguien va a
            // mirarlo, porque es verdad: entra con alerta en el panel.
            <p className="mt-1 text-sm text-[#8f8479]">
              Alguien del equipo lo va a revisar. Si hay algo que reponer, te escribimos.
            </p>
          )}
        </div>

        {/*
          El detalle se pide DESPUÉS, sobre una reseña ya guardada.

          Ponerlo antes de las estrellas costaría reseñas enteras; ponerlo aquí
          solo cuesta el detalle, y solo con quien no quiera darlo.
        */}
        {puedeAmpliar && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-sm text-[#c9bfb2]">¿Nos afinas un poco más? Es opcional.</p>

            <div className="mt-3 flex flex-col gap-2.5">
              {ATRIBUTOS.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#8f8479]">{a.texto}</span>
                  <Estrellas
                    valor={atributos[a.id] ?? 0}
                    onCambio={(n) => setAtributos((v) => ({ ...v, [a.id]: n }))}
                    tamano="pequeno"
                    etiqueta={a.texto}
                  />
                </div>
              ))}
            </div>

            <CampoLote valor={lote} onCambio={setLote} />

            <button
              type="button"
              onClick={ampliar}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full border border-white/15 font-medium text-[#f5f1ea]"
            >
              Enviar el detalle
            </button>
          </div>
        )}

        {detalleEnviado && (
          <p className="mt-4 text-center text-sm text-[#8f8479]">Anotado. Gracias de verdad.</p>
        )}
      </section>
    );
  }

  // --- Preguntando -----------------------------------------------------------
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6">
      <h2 className="font-display text-lg font-bold text-[#f5f1ea]">¿Qué tal estuvo?</h2>
      <p className="mt-1 text-sm text-[#8f8479]">Treinta segundos y nos ayudas mucho.</p>

      <div className="mt-5 flex justify-center">
        <Estrellas
          valor={nota}
          etiqueta="Tu nota"
          onCambio={(n) => {
            setNota(n);
            // Con nota alta se guarda al tocar. Quien está contento no quiere
            // rellenar un formulario, y cada paso de más pierde gente.
            if (n >= 4) void enviar(n, false);
          }}
        />
      </div>

      {nota > 0 && nota < 4 && (
        <div className="mt-5">
          <p className="text-sm text-[#c9bfb2]">¿Qué falló? Toca lo que aplique.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {MOTIVOS.map((m) => {
              const activo = motivos.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => alternarMotivo(m.id)}
                  aria-pressed={activo}
                  className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                    activo
                      ? 'border-[#d97325] bg-[#d97325]/15 text-[#f5f1ea]'
                      : 'border-white/12 text-[#c9bfb2]'
                  }`}
                >
                  {m.texto}
                </button>
              );
            })}
          </div>

          {/*
            Con nota baja los atributos se piden AQUÍ y no después: quien se
            queja ya está dedicando tiempo, y estas cuatro puntuaciones son el
            diagnóstico que dice a quién le toca arreglarlo.
          */}
          <div className="mt-5 flex flex-col gap-2.5">
            {ATRIBUTOS.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[#8f8479]">{a.texto}</span>
                <Estrellas
                  valor={atributos[a.id] ?? 0}
                  onCambio={(n) => setAtributos((v) => ({ ...v, [a.id]: n }))}
                  tamano="pequeno"
                  etiqueta={a.texto}
                />
              </div>
            ))}
          </div>

          <CampoLote valor={lote} onCambio={setLote} />

          <label htmlFor="com" className="mt-4 block text-sm text-[#c9bfb2]">
            ¿Nos cuentas algo más? (opcional)
          </label>
          <textarea
            id="com"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-2 w-full rounded-xl border border-white/12 bg-[#12100e] p-3 text-[#f5f1ea] placeholder:text-[#6b6258]"
            placeholder="Lo que sea que debamos saber…"
          />

          <button
            type="button"
            onClick={() => enviar(nota, true)}
            disabled={estado === 'enviando'}
            className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-60"
          >
            {estado === 'enviando' ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-amber-300">
          {error}
        </p>
      )}
    </section>
  );
}
