'use client';

// =============================================================================
// Botón para comprobar que las notificaciones llegan
// =============================================================================
//
// Sin esto, Web Push no se puede comprobar. La única forma de que saliera una
// notificación sería activar una campaña de verdad, y nadie enciende una campaña
// sobre clientes reales para averiguar si el canal funciona.
//
// El mensaje de error importa tanto como el botón: "este comensal no tiene
// notificaciones activadas" no es un fallo del sistema, es lo que hay que
// explicarle a quien está mirando la pantalla.

import { useState, useTransition } from 'react';
import { enviarPruebaPush } from '@/lib/acciones/whatsapp';

export function PruebaPush({ consumerId, puede }: { consumerId: string; puede: boolean }) {
  const [trabajando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  if (!puede) {
    return <p className="texto-suave text-sm">Tu rol no permite enviar notificaciones.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={trabajando}
        onClick={() =>
          iniciar(async () => {
            const r = await enviarPruebaPush(consumerId);
            setResultado(
              r.ok
                ? {
                    ok: true,
                    texto: `Enviada a ${r.datos?.entregados} dispositivo${
                      r.datos?.entregados === 1 ? '' : 's'
                    }. Debería aparecer en unos segundos.`,
                  }
                : { ok: false, texto: r.error ?? 'No se pudo enviar' }
            );
          })
        }
        className="rounded-lg border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
      >
        {trabajando ? 'Enviando…' : 'Enviar notificación de prueba'}
      </button>

      {resultado && (
        <p
          role="status"
          className={`text-sm ${
            resultado.ok
              ? 'text-green-600 dark:text-green-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {resultado.texto}
        </p>
      )}
    </div>
  );
}
