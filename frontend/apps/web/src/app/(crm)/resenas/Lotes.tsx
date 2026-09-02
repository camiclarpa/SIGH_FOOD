'use client';

// =============================================================================
// Alta y retiro de lotes
// =============================================================================
//
// Vive en el panel de reseñas y no en una sección aparte porque es donde se
// usa: se da de alta una tanda cuando se produce, y se retira cuando las
// reseñas dicen que salió mal. Separarlo obligaría a saltar entre pantallas
// justo en el momento de decidir.

import { useState, useTransition } from 'react';
import { alternarRetiroLote, crearLote } from '@/lib/acciones/lotes';

export function AltaLote({ productos }: { productos: Array<{ id: string; nombre: string }> }) {
  const [abierto, setAbierto] = useState(false);
  const [trabajando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Dar de alta un lote
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      action={(datos) => {
        setError(null);
        iniciar(async () => {
          const r = await crearLote({
            codigo: String(datos.get('codigo') ?? ''),
            productoId: String(datos.get('productoId') ?? '') || null,
            producidoEn: String(datos.get('producidoEn') ?? ''),
            venceEn: String(datos.get('venceEn') ?? '') || null,
            unidades: Number(datos.get('unidades')) || null,
            notas: String(datos.get('notas') ?? '') || null,
          });
          if (r.ok) setAbierto(false);
          else setError(r.error ?? 'No se pudo crear');
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Código impreso en la bolsa</span>
          <input
            name="codigo"
            required
            maxLength={40}
            placeholder="2026-08B"
            className="cifras rounded-lg border borde-tema bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Producto</span>
          <select name="productoId" className="rounded-lg border borde-tema bg-transparent px-3 py-2">
            {/* Vacío primero: una tanda puede ser mixta, y forzar a elegir uno
                obligaría a mentir en ese caso. */}
            <option value="">Tanda mixta</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Producido el</span>
          <input
            name="producidoEn"
            type="date"
            required
            className="rounded-lg border borde-tema bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Vence el (opcional)</span>
          <input
            name="venceEn"
            type="date"
            className="rounded-lg border borde-tema bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Unidades (opcional)</span>
          <input
            name="unidades"
            type="number"
            min="0"
            className="cifras rounded-lg border borde-tema bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="texto-suave text-xs">Notas (opcional)</span>
          <input
            name="notas"
            maxLength={255}
            placeholder="Horno 2, turno mañana"
            className="rounded-lg border borde-tema bg-transparent px-3 py-2"
          />
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={trabajando}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {trabajando ? 'Guardando…' : 'Crear lote'}
        </button>
        <button
          type="button"
          onClick={() => { setAbierto(false); setError(null); }}
          className="rounded-lg border borde-tema px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function RetirarLote({
  id,
  codigo,
  retirado,
}: {
  id: string;
  codigo: string;
  retirado: boolean;
}) {
  const [pidiendo, setPidiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [trabajando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (retirado) {
    return (
      <button
        type="button"
        disabled={trabajando}
        onClick={() => iniciar(async () => { await alternarRetiroLote(id, false); })}
        className="text-xs text-indigo-600 hover:underline disabled:opacity-60 dark:text-indigo-400"
      >
        Devolver a circulación
      </button>
    );
  }

  if (!pidiendo) {
    return (
      <button
        type="button"
        onClick={() => setPidiendo(true)}
        className="text-xs text-red-600 hover:underline dark:text-red-400"
      >
        Retirar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/*
        Se pide el motivo antes de retirar, no después. Dentro de tres meses,
        cuando el problema vuelva, esta frase es lo único que va a quedar.
      */}
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={500}
        placeholder={`¿Por qué se retira ${codigo}?`}
        className="w-full rounded-lg border borde-tema bg-transparent px-2 py-1 text-xs"
      />
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await alternarRetiroLote(id, true, motivo);
              if (r.ok) setPidiendo(false);
              else setError(r.error ?? 'No se pudo retirar');
            })
          }
          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
        >
          {trabajando ? 'Retirando…' : 'Confirmar'}
        </button>
        <button
          type="button"
          onClick={() => { setPidiendo(false); setError(null); }}
          className="text-xs text-slate-500"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
