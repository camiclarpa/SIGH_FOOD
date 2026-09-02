'use client';

// =============================================================================
// Límite de error de las pantallas del CRM
// =============================================================================
//
// Sin este archivo, un fallo en cualquier consulta —un corte momentáneo de Neon,
// por ejemplo— dejaba la pantalla de error genérica de Next: fondo en blanco,
// sin navegación y sin forma de reintentar salvo recargar a mano.
//
// Al vivir dentro de (crm), React lo pinta DENTRO del layout: la barra de
// navegación sigue ahí y el resto del CRM se puede seguir usando. Se cae la
// pantalla, no la aplicación.

import { useEffect } from 'react';

export default function ErrorCrm({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El mensaje real no se pinta —puede llevar detalles de la base—, pero sí
    // se registra. `digest` es el identificador que Next deja en los logs del
    // servidor, y es lo que permite atar lo que ve el usuario con la traza.
    console.error('[CRM] fallo al renderizar la pantalla', {
      digest: error.digest,
      mensaje: error.message,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-100">Esta pantalla no se pudo cargar</h1>

      <p className="mt-3 text-sm text-slate-400">
        Suele ser un fallo momentáneo de conexión con la base de datos. El resto del CRM
        sigue disponible en el menú.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Reintentar
        </button>

        <a
          href="/api/health"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Ver estado del sistema
        </a>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-slate-600">
          Referencia para soporte: <code>{error.digest}</code>
        </p>
      )}
    </div>
  );
}
