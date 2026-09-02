'use client';

import { useState, useTransition } from 'react';
import { registrarCompra, guardarProveedor } from '@/lib/acciones/inventario';

interface Insumo { id: string; nombre: string; unidadMedida: string }
interface Proveedor { id: string; nombre: string }

export function RegistrarCompra({ insumos, proveedores }: { insumos: Insumo[]; proveedores: Proveedor[] }) {
  const [abierto, setAbierto] = useState(false);
  const [insumoId, setInsumoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [referencia, setReferencia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const unidad = insumos.find((i) => i.id === insumoId)?.unidadMedida ?? '';

  function registrar() {
    const cantidadNum = Number(cantidad);
    const costoNum = Math.round(Number(costoTotal));
    if (!insumoId) { setError('Elige un insumo'); return; }
    if (!(cantidadNum > 0)) { setError('La cantidad debe ser mayor que cero'); return; }
    if (!(costoNum > 0)) { setError('El costo total debe ser mayor que cero'); return; }

    iniciar(async () => {
      let proveedorFinal = proveedorId || undefined;

      if (!proveedorFinal && nuevoProveedor.trim()) {
        const rp = await guardarProveedor({ nombre: nuevoProveedor.trim() });
        if (!rp.ok || !rp.datos) { setError(rp.error ?? 'No se pudo crear el proveedor'); return; }
        proveedorFinal = rp.datos.id;
      }

      const r = await registrarCompra({
        insumoId,
        proveedorId: proveedorFinal,
        cantidad: cantidadNum,
        costoTotalCOP: costoNum,
        referencia: referencia || undefined,
      });

      if (r.ok) {
        setMensaje(`Capa creada: ${cantidadNum} ${unidad} a $${(costoNum / cantidadNum).toFixed(2)}/${unidad} c/u`);
        setError(null);
        setCantidad('');
        setCostoTotal('');
        setReferencia('');
        setNuevoProveedor('');
      } else {
        setError(r.error ?? 'No se pudo registrar la compra');
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        + Registrar compra
      </button>
    );
  }

  return (
    <div className="rounded-md border borde-tema p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Insumo</span>
          <select
            value={insumoId}
            onChange={(e) => { setInsumoId(e.target.value); setError(null); setMensaje(null); }}
            className="superficie rounded-md border borde-tema px-3 py-1.5 text-sm"
          >
            <option value="">— elige un insumo —</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidadMedida})</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Proveedor (opcional)</span>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="superficie rounded-md border borde-tema px-3 py-1.5 text-sm"
          >
            <option value="">— sin proveedor —</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        {!proveedorId && (
          <label className="grid gap-1 sm:col-span-2">
            <span className="texto-suave text-xs">O da de alta un proveedor nuevo (opcional)</span>
            <input
              value={nuevoProveedor}
              onChange={(e) => setNuevoProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
              className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
            />
          </label>
        )}
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Cantidad comprada {unidad && `(${unidad})`}</span>
          <input
            type="number" min={0} step="any"
            value={cantidad}
            onChange={(e) => { setCantidad(e.target.value); setError(null); }}
            className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Costo total (COP)</span>
          <input
            type="number" min={0}
            value={costoTotal}
            onChange={(e) => { setCostoTotal(e.target.value); setError(null); }}
            className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <label className="grid gap-1 sm:col-span-2">
          <span className="texto-suave text-xs">Referencia de factura (opcional)</span>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button" onClick={registrar} disabled={enCurso}
          className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {enCurso ? 'Registrando…' : 'Registrar compra'}
        </button>
        <button
          type="button" onClick={() => { setAbierto(false); setError(null); setMensaje(null); }}
          className="texto-suave px-2 py-1.5 text-sm hover:underline"
        >
          Cerrar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {mensaje && <p className="mt-2 text-xs text-green-500">{mensaje}</p>}
    </div>
  );
}
