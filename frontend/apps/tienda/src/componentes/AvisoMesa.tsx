'use client';

/**
 * Franja que recuerda en qué mesa estás.
 *
 * Existe porque el contexto llega en la URL y desaparece al primer clic. Sin
 * este recordatorio, alguien que escaneó el QR de la mesa 4 llega al checkout
 * sin saber que su pedido va a ir allí — y si además ya no está sentado, la
 * comanda sale hacia una mesa vacía.
 *
 * Se puede quitar: quien escaneó el QR y luego decidió pedir a domicilio tiene
 * que poder salir del modo mesa sin borrar cookies a mano.
 */

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function AvisoMesa({ local, mesa }: { local: string; mesa: string }) {
  const router = useRouter();
  const [saliendo, iniciar] = useTransition();

  function salir() {
    iniciar(async () => {
      await fetch('/api/mesa', { method: 'DELETE' });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d97325]/40 bg-[#d97325]/10 px-4 py-3">
      <p className="min-w-0 text-sm text-[#f5f1ea]">
        <span aria-hidden className="mr-1.5">📍</span>
        Estás en <span className="font-semibold">{local}</span>, mesa{' '}
        <span className="font-semibold">{mesa}</span>
      </p>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        className="shrink-0 text-xs text-[#c9bfb2] underline underline-offset-4 disabled:opacity-50"
      >
        No estoy aquí
      </button>
    </div>
  );
}
