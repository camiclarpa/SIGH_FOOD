'use client';

/**
 * ============================================================================
 * Entrar con el teléfono
 * ============================================================================
 *
 * Dos pasos y ningún campo más: número, código. Sin contraseña que recordar,
 * sin correo que verificar, sin "acepto los términos".
 *
 * El código se pide con inputMode numérico y autoComplete="one-time-code": en
 * iOS y Android eso hace que el teclado salga en cifras y que el sistema
 * ofrezca pegar el código del mensaje de un toque. Es la diferencia entre
 * cambiar de app para copiarlo y no cambiar.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Fase = 'telefono' | 'codigo';

export default function Entrar({ volverA }: { volverA: string }) {
  const router = useRouter();
  const campoCodigo = useRef<HTMLInputElement>(null);

  const [fase, setFase] = useState<Fase>('telefono');
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  // Cuenta atrás para poder reenviar. Sin ella la gente pulsa "reenviar" tres
  // veces seguidas, y cada código nuevo invalida el anterior — que suele ser el
  // que ya le llegó.
  useEffect(() => {
    if (segundos <= 0) return;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  async function pedir(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const r = await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'pedir', telefono: telefono.trim() }),
      });
      const d = await r.json();

      if (!d.ok) {
        setError(d.error ?? 'No pudimos enviarte el código');
        setEnviando(false);
        return;
      }

      setAviso(d.aviso ?? null);
      setFase('codigo');
      setSegundos(45);
      // El foco salta al campo del código: en móvil ahorra un toque justo
      // cuando la persona ya está mirando la notificación.
      queueMicrotask(() => campoCodigo.current?.focus());
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
    }
    setEnviando(false);
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const r = await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accion: 'verificar', telefono: telefono.trim(), codigo }),
      });
      const d = await r.json();

      if (!d.ok) {
        setError(d.error ?? 'Código incorrecto');
        setCodigo('');
        setEnviando(false);
        return;
      }

      router.replace(volverA);
      router.refresh();
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
      setEnviando(false);
    }
  }

  const campo =
    'min-h-14 w-full rounded-xl border border-white/12 bg-[#1c1812] px-4 text-lg text-[#f5f1ea] placeholder:text-[#6b6258]';

  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-[#f5f1ea]">
        {fase === 'telefono' ? 'Entra con tu WhatsApp' : 'Escribe el código'}
      </h1>

      <p className="mt-2 leading-relaxed text-[#8f8479]">
        {fase === 'telefono'
          ? 'Sin contraseña. Te mandamos un código y listo.'
          : `Te lo mandamos al ${telefono}. Vale por 10 minutos.`}
      </p>

      {fase === 'telefono' ? (
        <form onSubmit={pedir} className="mt-8">
          <label htmlFor="tel" className="sr-only">
            Tu número de WhatsApp
          </label>
          <input
            id="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="300 123 4567"
            className={campo}
          />

          <button
            type="submit"
            disabled={enviando || telefono.trim().length < 7}
            className="mt-4 flex min-h-14 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviarme el código'}
          </button>
        </form>
      ) : (
        <form onSubmit={verificar} className="mt-8">
          <label htmlFor="cod" className="sr-only">
            Código de seis dígitos
          </label>
          <input
            id="cod"
            ref={campoCodigo}
            type="text"
            inputMode="numeric"
            // Hace que iOS y Android ofrezcan pegar el código del SMS/mensaje.
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={`${campo} text-center tracking-[0.5em]`}
          />

          <button
            type="submit"
            disabled={enviando || codigo.length !== 6}
            className="mt-4 flex min-h-14 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-50"
          >
            {enviando ? 'Comprobando…' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => pedir()}
            disabled={segundos > 0 || enviando}
            className="mt-4 w-full text-sm text-[#8f8479] underline underline-offset-4 disabled:no-underline disabled:opacity-60"
          >
            {segundos > 0 ? `Reenviar en ${segundos}s` : 'Reenviar el código'}
          </button>

          <button
            type="button"
            onClick={() => {
              setFase('telefono');
              setCodigo('');
              setError(null);
            }}
            className="mt-3 w-full text-sm text-[#8f8479]"
          >
            Cambiar de número
          </button>
        </form>
      )}

      {aviso && (
        <p className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {aviso}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-[#6b6258]">
        Usamos tu número para confirmarte el pedido y avisarte cuando salga. Nada más.
      </p>
    </div>
  );
}
