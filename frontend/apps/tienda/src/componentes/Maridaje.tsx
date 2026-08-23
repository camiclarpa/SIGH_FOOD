'use client';

/**
 * ============================================================================
 * Tarjeta de maridaje
 * ============================================================================
 *
 * Solo aparece si hay algo que sugerir. No hay estado de carga ni mensaje de
 * error: mientras no llegue nada, no se pinta nada.
 *
 * Es deliberado. Un "cargando sugerencia…" que a veces no termina en nada deja
 * un hueco vacío en la ficha del producto y hace que la página parezca rota; y
 * un "no pudimos sugerirte nada" le cuenta al cliente un problema nuestro que
 * no le importa. Esto es un extra que vende, no parte del camino de compra.
 */

import { useEffect, useState } from 'react';
import { ALMACEN_PALADAR } from './Paladar';
import type { Maridaje as Sugerencia } from '@/lib/maridaje';

export default function Maridaje({ slug }: { slug: string }) {
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);

  useEffect(() => {
    // Cancelable: si la persona cambia de producto antes de que llegue, la
    // respuesta vieja no debe pintarse sobre la ficha nueva.
    const control = new AbortController();

    let paladar: Record<string, string> | undefined;
    try {
      const crudo = localStorage.getItem(ALMACEN_PALADAR);
      if (crudo) paladar = JSON.parse(crudo) as Record<string, string>;
    } catch {
      // Sin perfil se sugiere igual, solo que de forma más genérica.
    }

    void fetch('/api/maridaje', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, ...(paladar ? { paladar } : {}) }),
      signal: control.signal,
    })
      .then((r) => (r.ok && r.status !== 204 ? r.json() : null))
      .then((d) => { if (d) setSugerencia(d as Sugerencia); })
      .catch(() => {
        // Incluye el abort. Ver el comentario de arriba: en silencio.
      });

    return () => control.abort();
  }, [slug]);

  if (!sugerencia) return null;

  return (
    <aside className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-500">
        Para acompañarlo
      </p>
      <p className="mt-1.5 text-lg font-semibold">{sugerencia.bebida}</p>
      <p className="mt-1 text-sm opacity-80">{sugerencia.porQue}</p>
      <p className="mt-2.5 text-xs opacity-70">
        ¿Sin alcohol? <span className="font-medium">{sugerencia.alternativa}</span>
      </p>
    </aside>
  );
}
