'use client';

/**
 * ============================================================================
 * Comanda
 * ============================================================================
 *
 * Una tarjeta por pedido, pensada para leerse de un vistazo desde metro y medio
 * y con las manos ocupadas. De ahí las decisiones:
 *
 *   · Los productos, grandes. Es lo único que la cocina necesita leer rápido;
 *     el nombre del cliente y la dirección importan al despachar, no al cocinar.
 *
 *   · Un solo botón grande para avanzar. Una lista de estados obligaría a elegir
 *     y a acertar; con un botón que dice el paso siguiente, no hay nada que
 *     decidir.
 *
 *   · Cancelar está aparte y pide confirmación. Es la única acción que no se
 *     puede deshacer.
 *
 *   · El tiempo transcurrido se calcula en el servidor y aquí solo avanza con un
 *     intervalo. Calcularlo en el render haría que el HTML del servidor y el
 *     del cliente no coincidieran, y React avisa de ello en consola.
 */

import { useEffect, useState, useTransition } from 'react';
import { avanzarPedido, marcarPagado, reenviarAviso } from '@/lib/acciones/pedidos';
import { siguientesDe, type EstadoPedido } from '@/lib/estados-pedido';

const ETIQUETAS: Record<string, string> = {
  recibido: 'Recibido',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/** Lo que pone el botón: el verbo del paso siguiente, no su nombre. */
const ACCION: Record<string, string> = {
  confirmado: 'Confirmar',
  preparando: 'Empezar a preparar',
  listo: 'Marcar listo',
  en_camino: 'Sale a domicilio',
  entregado: 'Entregado',
};

interface Item {
  nombreProducto: string;
  cantidad: number;
  opciones: Array<{ grupo: string; etiqueta: string; sobreprecio: number }> | null;
  notas: string | null;
}

export interface PedidoComanda {
  id: string;
  codigo: string;
  estado: string;
  estadoPago: string;
  metodoPago: string;
  tipoEntrega: string;
  nombre: string;
  telefono: string;
  direccion: string | null;
  indicaciones: string | null;
  totalCOP: number;
  /** Rebajado del subtotal por un código promocional. 0 = sin descuento. */
  descuentoCOP: number;
  notas: string | null;
  /** Local y mesa, cuando el pedido entró por el QR de una mesa. */
  local: string | null;
  mesa: string | null;
  /** Minutos desde que entró, calculados en el servidor. */
  minutosInicial: number;
  items: Item[];
}

function precio(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

export default function Comanda({
  pedido,
  puedeAvanzar,
}: {
  pedido: PedidoComanda;
  puedeAvanzar: boolean;
}) {
  const [minutos, setMinutos] = useState(pedido.minutosInicial);
  const [error, setError] = useState<string | null>(null);
  const [avisoReenvio, setAvisoReenvio] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();
  const [reenviando, setReenviando] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setMinutos((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const posibles = siguientesDe(pedido.estado as EstadoPedido, pedido.tipoEntrega);
  const siguiente = posibles.find((e) => e !== 'cancelado');
  const cerrado = pedido.estado === 'entregado' || pedido.estado === 'cancelado';

  // Un pedido que lleva mucho esperando se marca en rojo. Es el dato que hace
  // que la cola sirva de algo: sin él hay que leer todas las horas para saber
  // cuál urge.
  const tarde = !cerrado && minutos > 25;

  function mover(estado: EstadoPedido) {
    if (estado === 'cancelado') {
      const seguro = window.confirm(
        `¿Cancelar el pedido ${pedido.codigo}?\n\nNo se puede deshacer.`
      );
      if (!seguro) return;
    }

    iniciar(async () => {
      const r = await avanzarPedido({ id: pedido.id, estado });
      setError(r.ok ? null : r.error ?? 'No se pudo mover');
    });
  }

  function cobrar() {
    iniciar(async () => {
      const r = await marcarPagado(pedido.id);
      setError(r.ok ? null : r.error ?? 'No se pudo registrar');
    });
  }

  function avisar() {
    setReenviando(true);
    setAvisoReenvio(null);
    void reenviarAviso(pedido.id)
      .then((r) => {
        setAvisoReenvio(
          r.ok
            ? r.datos?.canal === 'ninguno'
              ? 'No se pudo entregar por ningún canal.'
              : `Enviado por ${r.datos?.canal}.`
            : r.error ?? 'No se pudo reenviar'
        );
      })
      .finally(() => setReenviando(false));
  }

  return (
    <article
      className={`superficie rounded-xl border p-4 ${
        tarde ? 'border-red-600/60' : 'borde-tema'
      }`}
    >
      {/* --- Cabecera --- */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="cifras text-sm font-bold text-orange-500">{pedido.codigo}</p>
          <p className="texto-suave text-xs">
            {ETIQUETAS[pedido.estado] ?? pedido.estado}
            {' · '}
            {pedido.tipoEntrega === 'mesa'
              ? 'en mesa'
              : pedido.tipoEntrega === 'recoger'
                ? 'recoge'
                : 'domicilio'}
          </p>
        </div>

        <div className="text-right">
          <p className={`cifras text-sm font-medium ${tarde ? 'text-red-400' : 'texto-suave'}`}>
            {minutos} min
          </p>
          <p className="cifras text-sm font-bold">{precio(pedido.totalCOP)}</p>
          {pedido.descuentoCOP > 0 && (
            <p className="cifras text-xs text-green-500">-{precio(pedido.descuentoCOP)} desc.</p>
          )}
        </div>
      </div>

      {/* La mesa va grande y arriba: en un pedido de local es el dato que
          decide a dónde va la bandeja, y se lee de lejos. */}
      {pedido.tipoEntrega === 'mesa' && pedido.mesa && (
        <p className="mt-3 rounded-lg bg-orange-600/15 px-3 py-2 text-center">
          <span className="font-display text-2xl font-bold text-orange-400">
            Mesa {pedido.mesa}
          </span>
          {pedido.local && <span className="texto-suave block text-xs">{pedido.local}</span>}
        </p>
      )}

      {/* --- Lo que hay que preparar --- */}
      <ul className="mt-3 space-y-2 border-y borde-tema py-3">
        {pedido.items.map((i, idx) => (
          <li key={idx}>
            <p className="font-medium">
              <span className="cifras text-orange-500">{i.cantidad}×</span> {i.nombreProducto}
            </p>
            {i.opciones && i.opciones.length > 0 && (
              <p className="texto-suave pl-6 text-xs">
                {i.opciones.map((o) => o.etiqueta).join(' · ')}
              </p>
            )}
            {i.notas && (
              <p className="pl-6 text-xs text-amber-400">⚠ {i.notas}</p>
            )}
          </li>
        ))}
      </ul>

      {pedido.notas && (
        <p className="mt-2 rounded bg-amber-950/30 px-2 py-1.5 text-xs text-amber-300">
          {pedido.notas}
        </p>
      )}

      {/* --- A quién --- */}
      <div className="texto-suave mt-3 space-y-0.5 text-xs">
        <p>
          {pedido.nombre} · <span className="cifras">{pedido.telefono}</span>
        </p>
        {pedido.tipoEntrega === 'domicilio' && pedido.direccion && (
          <p>
            {pedido.direccion}
            {pedido.indicaciones && ` — ${pedido.indicaciones}`}
          </p>
        )}
        <p>
          Pago con {pedido.metodoPago}
          {pedido.estadoPago === 'aprobado' ? (
            <span className="text-green-500"> · cobrado</span>
          ) : (
            <span className="text-amber-500"> · sin cobrar</span>
          )}
        </p>
      </div>

      {/* --- Acciones --- */}
      {puedeAvanzar && !cerrado && (
        <div className="mt-4 space-y-2">
          {siguiente && (
            <button
              type="button"
              onClick={() => mover(siguiente)}
              disabled={enCurso}
              className="min-h-11 w-full rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {enCurso ? '…' : ACCION[siguiente] ?? ETIQUETAS[siguiente]}
            </button>
          )}

          <div className="flex gap-2">
            {pedido.estadoPago !== 'aprobado' && (
              <button
                type="button"
                onClick={cobrar}
                disabled={enCurso}
                className="min-h-10 flex-1 rounded-lg border borde-tema px-3 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                Marcar cobrado
              </button>
            )}
            <button
              type="button"
              onClick={() => mover('cancelado')}
              disabled={enCurso}
              className="min-h-10 rounded-lg border border-red-800/50 px-3 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Reenviar el aviso funciona también con el pedido ya cerrado: es el
          caso típico de "dice que no le llegó nada" tras la entrega. */}
      {puedeAvanzar && (
        <div className="mt-3 border-t borde-tema pt-2.5">
          <button
            type="button"
            onClick={avisar}
            disabled={reenviando}
            className="texto-suave text-xs hover:underline disabled:opacity-50"
          >
            {reenviando ? 'Enviando…' : 'Avisar de nuevo'}
          </button>
          {avisoReenvio && <p className="texto-suave mt-1 text-xs">{avisoReenvio}</p>}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </article>
  );
}
