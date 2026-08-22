'use client';

/**
 * ============================================================================
 * Reseña post-entrega
 * ============================================================================
 *
 * Aparece SOLO cuando el pedido está entregado, y ahí mismo. Es el único
 * momento en que alguien recuerda a qué sabía: preguntar tres días después por
 * correo produce reseñas vagas, y preguntar antes de entregar produce
 * expectativas, no opiniones.
 *
 * Las estrellas se envían al tocarlas, sin botón de confirmar. El comentario es
 * opcional y va después: pedir texto antes de la nota hace que mucha gente no
 * deje ninguna de las dos.
 */

import { useState } from 'react';

export default function Resena({ codigo }: { codigo: string }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [estado, setEstado] = useState<'inicio' | 'enviando' | 'listo' | 'error'>('inicio');
  const [error, setError] = useState<string | null>(null);

  async function enviar(puntuacion: number, texto?: string) {
    setEstado('enviando');
    setError(null);

    try {
      const r = await fetch('/api/resena', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ codigo, puntuacion, comentario: texto?.trim() || undefined }),
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

  if (estado === 'listo') {
    return (
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6 text-center">
        <p className="text-3xl" aria-hidden>🙏</p>
        <p className="font-display mt-3 text-lg font-bold text-[#f5f1ea]">Gracias por contarnos</p>
        <p className="mt-1 text-sm text-[#8f8479]">
          Lo leemos todo. Es lo que nos dice qué arreglar.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-6">
      <h2 className="font-display text-lg font-bold text-[#f5f1ea]">¿Qué te pareció?</h2>
      <p className="mt-1 text-sm text-[#8f8479]">Treinta segundos y nos ayudas mucho.</p>

      <div className="mt-5 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setNota(n);
              // Con nota alta se envía directo: quien está contento no quiere
              // rellenar un formulario. Con nota baja se pide el motivo, que es
              // donde está la información útil.
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
          <label htmlFor="com" className="text-sm text-[#c9bfb2]">
            ¿Qué salió mal? Lo arreglamos.
          </label>
          <textarea
            id="com"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-2 w-full rounded-xl border border-white/12 bg-[#12100e] p-3 text-[#f5f1ea] placeholder:text-[#6b6258]"
            placeholder="Llegó frío, faltaba algo, tardó mucho…"
          />
          <button
            type="button"
            onClick={() => enviar(nota, comentario)}
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
