'use client';

// =============================================================================
// Consola de redención en mesa
// =============================================================================
//
// El personal teclea el código que enseña el comensal y el sistema decide. Es
// deliberadamente lo único que hay en pantalla: se usa de pie, con prisa y con
// el comensal esperando delante.

import { useState, useTransition } from 'react';
import { entregarCanje } from '@/lib/acciones/canjes';

type Estado =
  | { tipo: 'inactivo' }
  | { tipo: 'ok'; premio: string; comensal: string | null }
  | { tipo: 'error'; mensaje: string };

export function ConsolaRedencion({ puedeEntregar }: { puedeEntregar: boolean }) {
  const [codigo, setCodigo] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inactivo' });
  const [enCurso, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return;

    iniciar(async () => {
      const r = await entregarCanje({ codigo });
      if (r.ok && r.datos) {
        setEstado({ tipo: 'ok', premio: r.datos.premio, comensal: r.datos.comensal });
        // Se vacía solo si fue bien: ante un error, el código sigue ahí para
        // corregir una letra en vez de volver a teclearlo entero.
        setCodigo('');
      } else {
        setEstado({ tipo: 'error', mensaje: r.error ?? 'No se pudo entregar' });
      }
    });
  }

  if (!puedeEntregar) {
    return (
      <p className="texto-suave text-sm">
        Tu rol no permite entregar canjes. Pídeselo a un administrador o a un comercial.
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={enviar} className="flex flex-wrap gap-2">
        <input
          value={codigo}
          onChange={(e) => {
            // En mayúsculas desde el teclado: los códigos se generan así y
            // obligar a acertar con la tecla de bloqueo sobra.
            setCodigo(e.target.value.toUpperCase());
            setEstado({ tipo: 'inactivo' });
          }}
          placeholder="Código del canje"
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          className="superficie cifras min-w-0 flex-1 rounded-md border borde-tema px-3 py-2 text-lg tracking-widest"
        />
        <button
          type="submit"
          disabled={enCurso || !codigo.trim()}
          className="rounded-md bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {enCurso ? 'Comprobando…' : 'Entregar'}
        </button>
      </form>

      {estado.tipo === 'ok' && (
        <div
          role="status"
          className="mt-3 rounded-md border border-green-700/50 bg-green-950/30 px-4 py-3 text-sm text-green-200"
        >
          <strong className="font-semibold">Entregar: {estado.premio}</strong>
          {estado.comensal && <span className="block text-xs">a {estado.comensal}</span>}
        </div>
      )}

      {estado.tipo === 'error' && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          {estado.mensaje}
        </div>
      )}

      <p className="texto-suave mt-3 text-xs">
        El código se marca como entregado una sola vez. Si dos personas lo teclean a la
        vez, solo una lo entrega y la otra recibe el aviso.
      </p>
    </div>
  );
}
