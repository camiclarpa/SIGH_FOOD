'use client';

/**
 * ============================================================================
 * Ficha de producto y personalización
 * ============================================================================
 *
 * Aquí se vende más que en la tarjeta: hay sitio para los ingredientes, las
 * notas y las opciones.
 *
 * El precio de la cabecera se actualiza en vivo al elegir extras. Ver subir el
 * total ANTES de añadir evita la sorpresa en el carrito, que es donde la gente
 * abandona: "creía que eran 32.000".
 *
 * Los grupos de una sola opción se pintan como botones y no como radios
 * nativos: el objetivo táctil de un radio es el círculo, de unos 20 px, y en
 * móvil se falla. Aquí el objetivo es la fila entera.
 */

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { OpcionProducto, ProductoTienda } from '@/lib/consultas';
import { useCarrito } from './Carrito';
import { precio } from '@/lib/formato';

interface Grupo {
  nombre: string;
  multiple: boolean;
  opciones: OpcionProducto[];
}

export default function Personalizar({
  producto: p,
  opciones,
}: {
  producto: ProductoTienda;
  opciones: OpcionProducto[];
}) {
  const router = useRouter();
  const { anadir } = useCarrito();

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const o of opciones) {
      if (!mapa.has(o.grupo)) {
        mapa.set(o.grupo, { nombre: o.grupo, multiple: o.seleccionMultiple, opciones: [] });
      }
      mapa.get(o.grupo)!.opciones.push(o);
    }
    return [...mapa.values()];
  }, [opciones]);

  // Los grupos de una sola opción arrancan con su valor por defecto marcado.
  // Dejarlos vacíos obligaría a elegir algo obvio antes de poder pedir.
  const [elegidas, setElegidas] = useState<Set<string>>(() => {
    const inicial = new Set<string>();
    for (const g of grupos) {
      if (g.multiple) continue;
      const porDefecto = g.opciones.find((o) => o.porDefecto) ?? g.opciones[0];
      if (porDefecto) inicial.add(porDefecto.id);
    }
    return inicial;
  });

  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [anadido, setAnadido] = useState(false);

  function alternar(grupo: Grupo, id: string) {
    setElegidas((prev) => {
      const copia = new Set(prev);
      if (grupo.multiple) {
        if (copia.has(id)) copia.delete(id);
        else copia.add(id);
      } else {
        // En un grupo de una, elegir sustituye en lugar de sumar.
        for (const o of grupo.opciones) copia.delete(o.id);
        copia.add(id);
      }
      return copia;
    });
  }

  const seleccion = opciones.filter((o) => elegidas.has(o.id));
  const sobreprecio = seleccion.reduce((s, o) => s + o.sobreprecioCOP, 0);
  const unitario = p.precioCOP + sobreprecio;

  function alPedir() {
    anadir(
      {
        slug: p.slug,
        nombre: p.nombre,
        imagen: p.imagen,
        precioCOP: p.precioCOP,
        opciones: seleccion.map((o) => ({
          id: o.id,
          grupo: o.grupo,
          etiqueta: o.etiqueta,
          sobreprecioCOP: o.sobreprecioCOP,
        })),
        notas: notas.trim() || undefined,
      },
      cantidad
    );

    // Confirmación breve antes de navegar: sin ella, el salto al carrito se
    // siente como si la app hubiera hecho algo que no pediste.
    setAnadido(true);
    setTimeout(() => router.push('/carrito'), 450);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* --- Foto --- */}
      <div className="relative aspect-[4/3] w-full bg-[#12100e] sm:aspect-[16/9]">
        {p.imagen && (
          <Image
            src={p.imagen}
            alt={p.nombre}
            fill
            priority
            className="object-cover object-top"
            sizes="(min-width: 768px) 768px, 100vw"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#12100e] to-transparent" />
      </div>

      <div className="px-4 pb-8">
        <h1 className="font-display -mt-6 relative text-3xl font-bold leading-tight text-[#f5f1ea]">
          {p.nombre}
        </h1>

        {p.gancho && <p className="mt-2 text-lg text-[#d97325]">{p.gancho}</p>}
        {p.descripcion && (
          <p className="mt-3 leading-relaxed text-[#c9bfb2]">{p.descripcion}</p>
        )}

        {/* --- Ficha --- */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#8f8479]">
          {p.pesoGramos && <span>{p.pesoGramos} g</span>}
          {p.vegetariano && <span className="text-[#9bbf6a]">Apto vegetariano</span>}
          {p.maridaje.length > 0 && <span>Va bien con {p.maridaje.join(' o ')}</span>}
        </div>

        {p.ingredientes.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
              Lleva
            </h2>
            <ul className="mt-3 space-y-1.5">
              {p.ingredientes.map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#c9bfb2]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97325]" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- Opciones --- */}
        {grupos.map((g) => (
          <fieldset key={g.nombre} className="mt-7">
            <legend className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
              {g.nombre}
              {g.multiple && <span className="ml-2 normal-case tracking-normal">· opcional</span>}
            </legend>

            <div className="mt-3 space-y-2">
              {g.opciones.map((o) => {
                const activa = elegidas.has(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => alternar(g, o.id)}
                    aria-pressed={activa}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left transition-colors ${
                      activa
                        ? 'border-[#d97325] bg-[#d97325]/12 text-[#f5f1ea]'
                        : 'border-white/12 text-[#c9bfb2]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                          g.multiple ? 'rounded-md' : 'rounded-full'
                        } ${activa ? 'border-[#d97325] bg-[#d97325]' : 'border-white/30'}`}
                      >
                        {activa && <span className="text-xs text-[#12100e]">✓</span>}
                      </span>
                      {o.etiqueta}
                    </span>

                    {o.sobreprecioCOP > 0 && (
                      <span className="shrink-0 text-sm text-[#8f8479]">
                        +{precio(o.sobreprecioCOP)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {/* --- Notas para la cocina --- */}
        <div className="mt-7">
          <label
            htmlFor="notas"
            className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]"
          >
            Algo que debamos saber
          </label>
          <input
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={200}
            placeholder="Alergias, sin cebolla, poco picante…"
            className="mt-3 min-h-12 w-full rounded-xl border border-white/12 bg-[#1c1812] px-4 text-[#f5f1ea] placeholder:text-[#6b6258]"
          />
        </div>

        {/* --- Cantidad y añadir --- */}
        <div className="mt-8 flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-full border border-white/15">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={cantidad <= 1}
              aria-label="Quitar uno"
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl text-[#f5f1ea] disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center font-display text-lg font-bold text-[#f5f1ea]">
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(20, c + 1))}
              disabled={cantidad >= 20}
              aria-label="Añadir uno"
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl text-[#f5f1ea] disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={alPedir}
            disabled={anadido}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#d97325] px-6 font-semibold text-[#12100e] transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {anadido ? '✓ Añadido' : `Añadir · ${precio(unitario * cantidad)}`}
          </button>
        </div>

        {sobreprecio > 0 && (
          <p className="mt-3 text-center text-sm text-[#8f8479]">
            {precio(p.precioCOP)} + {precio(sobreprecio)} en extras
          </p>
        )}
      </div>
    </div>
  );
}
