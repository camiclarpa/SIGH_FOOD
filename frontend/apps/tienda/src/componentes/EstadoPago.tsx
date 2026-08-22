'use client';

/**
 * ============================================================================
 * Estado del pago y reintento
 * ============================================================================
 *
 * Contesta la pregunta que más consultas genera después de pulsar pagar: «¿se
 * cobró o no?». Dejarla sin responder es peor que un rechazo — quien no sabe si
 * pagó no vuelve a intentarlo por miedo a que le cobren dos veces, y tampoco
 * llama.
 *
 * Y cuando el pago se rechaza, el pedido NO se pierde: sigue en la base con
 * todo dentro, y desde aquí se reintenta con un toque. Obligar a rehacer el
 * carrito tras un rechazo es donde se pierde una compra que ya estaba decidida
 * — la tarjeta falla por mil motivos tontos y casi todos se arreglan al segundo
 * intento.
 */

import { useState } from 'react';
import { precio } from '@/lib/formato';

type Estado = 'pendiente' | 'procesando' | 'aprobado' | 'rechazado' | 'reembolsado';

const TEXTOS: Record<Estado, { titulo: string; detalle: string; tono: string }> = {
  aprobado: {
    titulo: 'Pago confirmado',
    detalle: 'Ya está cobrado. No tienes que hacer nada más.',
    tono: 'border-green-700/40 bg-green-950/20 text-green-200',
  },
  procesando: {
    titulo: 'Confirmando tu pago',
    detalle: 'Estamos esperando a que el banco confirme. Suele tardar segundos.',
    tono: 'border-amber-700/40 bg-amber-950/20 text-amber-200',
  },
  rechazado: {
    titulo: 'El pago no pasó',
    detalle: 'No se te cobró nada. Puedes intentarlo otra vez sin rehacer el pedido.',
    tono: 'border-red-700/40 bg-red-950/20 text-red-200',
  },
  pendiente: {
    titulo: 'Pendiente de pago',
    detalle: 'Todavía no se ha cobrado.',
    tono: 'border-white/15 bg-[#1c1812] text-[#c9bfb2]',
  },
  reembolsado: {
    titulo: 'Pago devuelto',
    detalle: 'El importe se te devolvió.',
    tono: 'border-white/15 bg-[#1c1812] text-[#c9bfb2]',
  },
};

export default function EstadoPago({
  codigo,
  estadoPago,
  metodoPago,
  totalCOP,
  mensajeFallo,
  enLinea,
}: {
  codigo: string;
  estadoPago: string;
  metodoPago: string;
  totalCOP: number;
  /** Lo que dijo la pasarela al rechazar, si dijo algo. */
  mensajeFallo: string | null;
  /** Si el método pasa por la pasarela. Con efectivo no hay nada que reintentar. */
  enLinea: boolean;
}) {
  const [yendo, setYendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estado = (estadoPago as Estado) ?? 'pendiente';
  const t = TEXTOS[estado] ?? TEXTOS.pendiente;

  async function reintentar() {
    setYendo(true);
    setError(null);

    try {
      const r = await fetch('/api/pagar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ codigo }),
      });
      const d = await r.json();

      if (d.ok && d.url) {
        window.location.href = d.url;
        return;
      }

      setError(d.error ?? 'No pudimos abrir el pago');
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
    }
    setYendo(false);
  }

  // Con efectivo no hay estado de pago que enseñar: se paga al recibir y ya.
  if (!enLinea && estado === 'pendiente') {
    return (
      <p className="mt-6 rounded-xl border border-white/10 bg-[#1c1812] px-4 py-3 text-center text-sm text-[#8f8479]">
        Pagas {precio(totalCOP)} en efectivo al recibir.
      </p>
    );
  }

  return (
    <section className={`mt-6 rounded-2xl border px-5 py-4 ${t.tono}`}>
      <p className="font-display text-lg font-bold">{t.titulo}</p>
      <p className="mt-1 text-sm opacity-90">{t.detalle}</p>

      {/* El motivo del rechazo se enseña tal cual lo da el banco. Es feo, pero
          "Fondos insuficientes" le dice a la persona qué hacer y "error en el
          pago" no. */}
      {estado === 'rechazado' && mensajeFallo && (
        <p className="mt-2 text-xs opacity-75">Motivo: {mensajeFallo}</p>
      )}

      {estado === 'rechazado' && enLinea && (
        <>
          <button
            type="button"
            onClick={reintentar}
            disabled={yendo}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-60"
          >
            {yendo ? 'Abriendo el pago…' : `Reintentar · ${precio(totalCOP)}`}
          </button>
          <p className="mt-2 text-center text-xs opacity-70">
            Tu pedido sigue guardado. No hay que volver a armarlo.
          </p>
        </>
      )}

      {estado === 'pendiente' && enLinea && (
        <button
          type="button"
          onClick={reintentar}
          disabled={yendo}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-60"
        >
          {yendo ? 'Abriendo el pago…' : `Pagar ${precio(totalCOP)}`}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-sm">
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-xs opacity-60">
        {metodoPago === 'pse' ? 'PSE' : metodoPago} · {precio(totalCOP)}
      </p>
    </section>
  );
}
