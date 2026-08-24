'use client';

/**
 * ============================================================================
 * Reseña post-entrega
 * ============================================================================
 *
 * CUÁNDO SE PREGUNTA
 * ------------------
 * No en el momento de la entrega. Ahí la persona acaba de recibir la bolsa y
 * todavía no ha probado nada: lo que se obtiene son notas sobre el reparto —si
 * tardó, si el repartidor fue amable— y no sobre la comida, que es lo que se
 * quería saber.
 *
 * Se pregunta un rato después, cuando ya comió. De eso se encarga el aviso
 * automático; esta pantalla solo aparece cuando ha pasado ese rato.
 *
 * LO QUE PASA SEGÚN LA NOTA
 * -------------------------
 * Con 4 o 5 estrellas se agradece y se le invita a contarlo en Google, que es
 * donde esa opinión sirve para traer a alguien nuevo. Guardada solo en nuestra
 * base no la ve nadie.
 *
 * Con 3 o menos se abre un formulario interno con motivos de un toque. Y se
 * queda AQUÍ: no se le manda a Google a publicar un enfado que todavía se puede
 * resolver. No es esconder la crítica —entra igual en el CRM y levanta una
 * alerta— es atenderla antes de que sea pública.
 */

import { useState } from 'react';

/** Motivos de un toque. Casi nadie escribe texto en el móvil. */
const MOTIVOS = [
  { id: 'temperatura', texto: 'Llegó frío' },
  { id: 'tiempo', texto: 'Tardó mucho' },
  { id: 'empaque', texto: 'El empaque' },
  { id: 'sabor', texto: 'El sabor' },
  { id: 'cantidad', texto: 'La cantidad' },
  { id: 'otro', texto: 'Otra cosa' },
] as const;

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
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'listo' | 'error'>('inicio');
  const [error, setError] = useState<string | null>(null);

  const alta = nota >= 4;

  function alternarMotivo(id: string) {
    setMotivos((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function enviar(puntuacion: number, texto?: string, marcados?: string[]) {
    setEstado('enviando');
    setError(null);

    try {
      const r = await fetch('/api/resena', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          codigo,
          puntuacion,
          comentario: texto?.trim() || undefined,
          motivos: marcados?.length ? marcados : undefined,
        }),
      });
      const d = await r.json();

      if (!d.ok) {
        setError(d.error ?? 'No pudimos guardar tu reseña');
        setEstado('error');
        return;
      }
      setEstado('listo');
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
      setEstado('error');
    }
  }

  // --- Enviada ---------------------------------------------------------------
  if (estado === 'listo') {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6 text-center">
        <p className="text-3xl" aria-hidden>
          {alta ? '🌶' : '🙏'}
        </p>

        {alta ? (
          <>
            <p className="font-display mt-3 text-lg font-bold text-[#f5f1ea]">
              Nos alegra un montón
            </p>

            {urlGoogle ? (
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
                <p className="mt-2 text-xs text-[#6b6258]">Treinta segundos, y se nota mucho.</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-[#8f8479]">
                Gracias por contárnoslo. Nos anima a seguir.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-display mt-3 text-lg font-bold text-[#f5f1ea]">
              Gracias por decírnoslo
            </p>
            {/*
              Con nota baja NO se le manda a Google. Y se le dice que alguien va
              a mirarlo, porque es verdad: entra en el CRM con una alerta.
            */}
            <p className="mt-1 text-sm text-[#8f8479]">
              Alguien del equipo lo va a revisar. Si hay algo que reponer, te escribimos.
            </p>
          </>
        )}
      </section>
    );
  }

  // --- Preguntando -----------------------------------------------------------
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6">
      <h2 className="font-display text-lg font-bold text-[#f5f1ea]">¿Qué tal estuvo?</h2>
      <p className="mt-1 text-sm text-[#8f8479]">Treinta segundos y nos ayudas mucho.</p>

      <div className="mt-5 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setNota(n);
              // Con nota alta se envía al tocar: quien está contento no quiere
              // rellenar un formulario, y cada paso de más pierde gente.
              if (n >= 4) void enviar(n);
            }}
            disabled={estado === 'enviando'}
            aria-label={`${n} de 5`}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl transition-transform active:scale-95 ${
              n <= nota ? 'text-[#d97325]' : 'text-[#4a4239]'
            }`}
          >
            ★
          </button>
        ))}
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
            onClick={() => enviar(nota, comentario, motivos)}
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
