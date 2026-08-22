'use client';

/**
 * ============================================================================
 * Mi cuenta
 * ============================================================================
 *
 * Tres cosas, en el orden en que importan para que alguien vuelva:
 *
 *   1. El club. Es lo único que da una razón para pedir HOY en lugar de en
 *      cualquier otro sitio, y una barra que dice "te faltan dos" mueve mucho
 *      más que un saldo de puntos que no significa nada sin conversión.
 *   2. Repetir el último pedido. Un toque. La recompra es donde se gana un
 *      negocio de comida, y obligar a recorrer el catálogo otra vez para pedir
 *      exactamente lo mismo es donde se pierde.
 *   3. Favoritos y el resto del historial.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  SELLOS_PARA_PREMIO,
  type EstadoClub,
  type Identidad,
  type LineaRecompra,
  type PedidoResumen,
} from '@/lib/club-tipos';
import { useCarrito } from './Carrito';
import { precio } from '@/lib/formato';

const ESTADOS: Record<string, string> = {
  recibido: 'Recibido',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export default function VistaCuenta({
  identidad,
  club,
  pedidos,
  favoritos,
}: {
  identidad: Identidad;
  club: EstadoClub;
  pedidos: PedidoResumen[];
  favoritos: LineaRecompra[];
}) {
  const router = useRouter();
  const { anadir, vaciar } = useCarrito();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  /**
   * Mete un pedido anterior en el carrito.
   *
   * Vacía primero: "repetir" significa exactamente eso, no "añadir encima de lo
   * que ya tenías". Mezclarlo produce carritos sorpresa que se descubren en el
   * checkout.
   */
  async function repetir(pedidoId: string) {
    setCargando(pedidoId);
    setError(null);

    try {
      const r = await fetch(`/api/repetir?pedido=${pedidoId}`);
      const d = await r.json();

      if (!d.ok || !d.lineas?.length) {
        setError(d.error ?? 'No pudimos recuperar ese pedido');
        setCargando(null);
        return;
      }

      const agotados = (d.lineas as LineaRecompra[]).filter((l) => !l.disponible);
      const buenas = (d.lineas as LineaRecompra[]).filter((l) => l.disponible);

      if (buenas.length === 0) {
        setError('Nada de ese pedido está disponible ahora mismo.');
        setCargando(null);
        return;
      }

      vaciar();
      for (const l of buenas) {
        anadir(
          {
            slug: l.slug,
            nombre: l.nombre,
            imagen: l.imagen,
            precioCOP: l.precioCOP,
            opciones: l.opciones,
          },
          l.cantidad
        );
      }

      // Lo que falta se dice ANTES de llevar al carrito, no después: enterarse
      // en la caja de que falta la mitad del pedido es peor que saberlo ya.
      if (agotados.length > 0) {
        setError(`No pudimos añadir: ${agotados.map((a) => a.nombre).join(', ')} (agotado).`);
        setCargando(null);
        return;
      }

      iniciar(() => router.push('/carrito'));
    } catch {
      setError('Sin conexión. Inténtalo otra vez.');
      setCargando(null);
    }
  }

  function anadirFavorito(f: LineaRecompra) {
    anadir(
      { slug: f.slug, nombre: f.nombre, imagen: f.imagen, precioCOP: f.precioCOP, opciones: f.opciones },
      1
    );
    router.push('/carrito');
  }

  async function salir() {
    await fetch('/api/sesion', { method: 'DELETE' });
    router.replace('/');
    router.refresh();
  }

  const ultimo = pedidos.find((p) => p.estado === 'entregado') ?? pedidos[0];
  const porcentaje = Math.round((club.sellos / SELLOS_PARA_PREMIO) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#f5f1ea]">
            {identidad.nombre || 'Tu cuenta'}
          </h1>
          <p className="cifras text-sm text-[#8f8479]">+{identidad.telefono}</p>
        </div>
        <button
          type="button"
          onClick={salir}
          className="min-h-11 rounded-full border border-white/15 px-4 text-sm text-[#c9bfb2]"
        >
          Salir
        </button>
      </div>

      {/* --- Bocazo Club --- */}
      <section className="mt-6 rounded-2xl border border-[#d97325]/30 bg-gradient-to-br from-[#d97325]/12 to-transparent p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-[#f5f1ea]">Bocazo Club</h2>
          <span className="cifras text-sm text-[#c9bfb2]">{club.puntos} puntos</span>
        </div>

        {club.tienePremio ? (
          <p className="mt-3 font-display text-xl font-bold text-[#d97325]">
            Tienes un cono gratis esperándote. Pídelo en tu próxima visita.
          </p>
        ) : (
          <>
            <p className="mt-3 text-[#c9bfb2]">
              {club.faltan === 1
                ? 'Un pedido más y el siguiente cono va por nuestra cuenta.'
                : `Te faltan ${club.faltan} pedidos para un cono gratis.`}
            </p>

            {/* Sellos, no una barra lisa: se cuentan de un vistazo y se parecen
                a la tarjeta de cartón que la gente ya entiende. */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: SELLOS_PARA_PREMIO }, (_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm ${
                    i < club.sellos
                      ? 'border-[#d97325] bg-[#d97325] text-[#12100e]'
                      : 'border-white/20 text-transparent'
                  }`}
                >
                  ✓
                </span>
              ))}
            </div>
            <p className="sr-only">
              {club.sellos} de {SELLOS_PARA_PREMIO} sellos, {porcentaje}%
            </p>
          </>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-amber-700/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      )}

      {/* --- Repetir --- */}
      {ultimo && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#1c1812] p-5">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
            Tu último pedido
          </h2>
          <p className="mt-3 text-[#f5f1ea]">
            {ultimo.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
          </p>
          <p className="text-sm text-[#8f8479]">
            {precio(ultimo.totalCOP)} · {ESTADOS[ultimo.estado] ?? ultimo.estado}
          </p>

          <button
            type="button"
            onClick={() => repetir(ultimo.id)}
            disabled={cargando === ultimo.id}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-[#d97325] font-semibold text-[#12100e] disabled:opacity-60"
          >
            {cargando === ultimo.id ? 'Preparando…' : 'Pedir lo mismo'}
          </button>
        </section>
      )}

      {/* --- Favoritos --- */}
      {favoritos.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
            Tus favoritos
          </h2>
          <ul className="mt-3 space-y-2">
            {favoritos.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#1c1812] p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#f5f1ea]">{f.nombre}</p>
                  {f.opciones.length > 0 && (
                    <p className="text-xs text-[#8f8479]">
                      {f.opciones.map((o) => o.etiqueta).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => anadirFavorito(f)}
                  disabled={!f.disponible}
                  className="min-h-10 shrink-0 rounded-full bg-[#d97325] px-4 text-sm font-semibold text-[#12100e] disabled:opacity-40"
                >
                  {f.disponible ? 'Pedir' : 'Agotado'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Historial --- */}
      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
          Tus pedidos
        </h2>

        {pedidos.length === 0 ? (
          <p className="mt-3 text-[#8f8479]">
            Todavía no has pedido nada.{' '}
            <Link href="/" className="text-[#d97325] underline underline-offset-4">
              Empieza por aquí
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/10">
            {pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/pedido/${p.codigo}`}
                    className="cifras text-sm font-medium text-[#d97325]"
                  >
                    {p.codigo}
                  </Link>
                  <p className="truncate text-sm text-[#c9bfb2]">
                    {p.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
                  </p>
                  <p className="text-xs text-[#8f8479]">
                    {precio(p.totalCOP)} · {ESTADOS[p.estado] ?? p.estado}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => repetir(p.id)}
                  disabled={cargando === p.id}
                  className="min-h-10 shrink-0 rounded-full border border-white/15 px-4 text-sm text-[#f5f1ea] disabled:opacity-50"
                >
                  {cargando === p.id ? '…' : 'Repetir'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
