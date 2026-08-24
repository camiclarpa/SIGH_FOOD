'use client';

/**
 * ============================================================================
 * Seguimiento del pedido
 * ============================================================================
 *
 * Lo que convierte "pedido #1245" en una experiencia. La diferencia entre las
 * dos cosas es si la persona sabe qué está pasando AHORA o solo tiene un
 * número.
 *
 * Se refresca sola cada 30 segundos mientras el pedido está vivo, y deja de
 * hacerlo cuando llega a entregado o cancelado. Un intervalo que sigue
 * corriendo en una pestaña olvidada gasta batería y pega a la base sin motivo
 * durante horas.
 *
 * Con un pedido para recoger, el paso "en camino" no se pinta: enseñar una
 * etapa que nunca va a ocurrir hace que parezca atascado.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { PedidoCompleto } from '@/lib/consultas';
import { precio } from '@/lib/formato';
import Resena from './Resena';
import EstadoPago from './EstadoPago';

const PASOS_DOMICILIO = [
  { id: 'recibido', etiqueta: 'Pedido recibido', nota: 'Lo tenemos' },
  { id: 'confirmado', etiqueta: 'Confirmado', nota: 'Te escribimos por WhatsApp' },
  { id: 'preparando', etiqueta: 'Preparando', nota: 'Se está armando ahora' },
  { id: 'listo', etiqueta: 'Listo', nota: 'Recién hecho' },
  { id: 'en_camino', etiqueta: 'En camino', nota: 'Va para allá' },
  { id: 'entregado', etiqueta: 'Entregado', nota: 'Que aproveche' },
];

const PASOS_RECOGER = PASOS_DOMICILIO.filter((p) => p.id !== 'en_camino').map((p) =>
  p.id === 'listo' ? { ...p, nota: 'Puedes venir a recogerlo' } : p
);

const TITULARES: Record<string, string> = {
  recibido: 'Tenemos tu pedido',
  confirmado: 'Pedido confirmado',
  preparando: 'Se está preparando',
  listo: 'Tu Bocazo está listo',
  en_camino: 'Va en camino',
  entregado: 'Entregado',
  cancelado: 'Pedido cancelado',
};

export default function Seguimiento({
  pedido,
  pago,
  urlGoogle,
}: {
  pedido: PedidoCompleto;
  pago: { mensajeFallo: string | null; enLinea: boolean };
  /** Perfil de Google del negocio. Sin él no se enseña la invitación a reseñar. */
  urlGoogle?: string;
}) {
  const router = useRouter();

  const terminado = pedido.estado === 'entregado' || pedido.estado === 'cancelado';

  /*
    Minutos que se espera antes de preguntar qué tal estuvo.

    Es el tiempo aproximado de sentarse y comer. Menos da opiniones sobre el
    reparto; mucho más y el recuerdo ya es vago.
  */
  const MINUTOS_ANTES_DE_PREGUNTAR = 35;
  const puedeResenar =
    pedido.entregadoEn !== null &&
    Date.now() - new Date(pedido.entregadoEn).getTime() >= MINUTOS_ANTES_DE_PREGUNTAR * 60_000;
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    if (terminado) return;

    /*
      Se PREGUNTA cada pocos segundos y solo se recarga cuando algo cambió.

      Antes esto llamaba a router.refresh() cada 30 segundos. Medio minuto es
      una eternidad delante de una pantalla que promete actualizarse sola: la
      cocina marca "listo" y el cliente sigue leyendo "preparando", así que
      recarga a mano y concluye, con razón, que no funciona.

      Bajar el intervalo sin más habría significado volver a pedir la página
      entera doce veces por minuto y por cliente, casi siempre para descubrir
      que nada cambió. En vez de eso se consulta un endpoint diminuto que
      devuelve dos campos, y la página completa solo se vuelve a pedir cuando el
      estado es distinto del que hay en pantalla.
    */
    let vivo = true;
    let ultimoVisto = pedido.estado;

    const preguntar = async () => {
      try {
        const r = await fetch(`/api/pedido/${pedido.codigo}/estado`, { cache: 'no-store' });
        if (!r.ok || !vivo) return;

        const d = (await r.json()) as { estado?: string; estadoPago?: string };
        if (!d.estado || !vivo) return;

        if (d.estado !== ultimoVisto) {
          ultimoVisto = d.estado;
          setRefrescando(true);
          // router.refresh() vuelve a pedir el componente de servidor sin
          // recargar la página: el estado se actualiza sin perder el scroll ni
          // parpadear.
          router.refresh();
          setTimeout(() => vivo && setRefrescando(false), 800);
        }
      } catch {
        // Un fallo de red no rompe nada: se vuelve a intentar en el siguiente
        // ciclo. Con el móvil en el bolsillo esto pasa constantemente.
      }
    };

    // La primera consulta va enseguida: quien acaba de llegar desde el checkout
    // no debe esperar un ciclo entero para ver el estado real.
    preguntar();
    const t = setInterval(preguntar, 5_000);

    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [terminado, router, pedido.estado, pedido.codigo]);

  const pasos = pedido.tipoEntrega === 'recoger' ? PASOS_RECOGER : PASOS_DOMICILIO;
  const actual = pasos.findIndex((p) => p.id === pedido.estado);
  const cancelado = pedido.estado === 'cancelado';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* --- Cabecera --- */}
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
          {pedido.codigo}
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold text-[#f5f1ea]">
          {TITULARES[pedido.estado] ?? 'Tu pedido'}
        </h1>
        {!terminado && (
          <p className="mt-2 text-sm text-[#8f8479]">
            {refrescando ? 'Actualizando…' : 'Esta página se actualiza sola'}
          </p>
        )}
      </div>

      {/* El estado del pago va ANTES que el del pedido: quien acaba de pulsar
          pagar quiere saber si se cobró, no en qué paso de la cocina está. */}
      <EstadoPago
        codigo={pedido.codigo}
        estadoPago={pedido.estadoPago}
        metodoPago={pedido.metodoPago}
        totalCOP={pedido.totalCOP}
        mensajeFallo={pago.mensajeFallo}
        enLinea={pago.enLinea}
      />

      {/* --- Estados --- */}
      {cancelado ? (
        <div className="mt-8 rounded-2xl border border-red-700/40 bg-red-950/20 p-6 text-center">
          <p className="text-red-200">
            Este pedido se canceló. Si crees que es un error, escríbenos y lo miramos.
          </p>
        </div>
      ) : (
        <ol className="mt-9 space-y-0">
          {pasos.map((p, i) => {
            const hecho = i <= actual;
            const enCurso = i === actual;
            const ultimo = i === pasos.length - 1;

            return (
              <li key={p.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm ${
                      hecho
                        ? 'border-[#d97325] bg-[#d97325] text-[#12100e]'
                        : 'border-white/20 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  {!ultimo && (
                    <span
                      className={`w-0.5 flex-1 ${hecho && i < actual ? 'bg-[#d97325]' : 'bg-white/12'}`}
                      style={{ minHeight: '2.25rem' }}
                    />
                  )}
                </div>

                <div className={`pb-9 ${ultimo ? 'pb-0' : ''}`}>
                  <p
                    className={`font-display font-bold ${
                      hecho ? 'text-[#f5f1ea]' : 'text-[#6b6258]'
                    }`}
                  >
                    {p.etiqueta}
                  </p>
                  {enCurso && <p className="mt-0.5 text-sm text-[#d97325]">{p.nota}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* --- Qué pediste --- */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-[#1c1812] p-5">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]">
          Tu pedido
        </h2>

        <ul className="mt-4 space-y-3">
          {pedido.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[#f5f1ea]">
                  {i.cantidad} × {i.nombreProducto}
                </p>
                {i.opciones.length > 0 && (
                  <p className="text-xs text-[#8f8479]">
                    {i.opciones.map((o) => o.etiqueta).join(' · ')}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[#c9bfb2]">{precio(i.subtotalCOP)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-[#8f8479]">
            <dt>Productos</dt>
            <dd>{precio(pedido.subtotalCOP)}</dd>
          </div>
          {pedido.envioCOP > 0 && (
            <div className="flex justify-between text-[#8f8479]">
              <dt>Domicilio</dt>
              <dd>{precio(pedido.envioCOP)}</dd>
            </div>
          )}
          {pedido.propinaCOP > 0 && (
            <div className="flex justify-between text-[#8f8479]">
              <dt>Propina</dt>
              <dd>{precio(pedido.propinaCOP)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1.5 text-base font-bold text-[#f5f1ea]">
            <dt>Total</dt>
            <dd className="font-display">{precio(pedido.totalCOP)}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-[#8f8479]">
          {pedido.tipoEntrega === 'domicilio'
            ? `A domicilio · ${pedido.direccion}`
            : 'Para recoger en el local'}
        </p>


      </section>

      {/* --- Reseña, solo al entregar --- */}
      {/*
        LA RESEÑA NO SE PIDE AL ENTREGAR.

        Al recibir la bolsa la persona todavía no ha probado nada: lo que
        contesta ahí es sobre el reparto, no sobre la comida. Y una nota puesta
        antes de comer es la que después aparece en el panel como si fuera un
        juicio del producto.

        Se espera un rato. Quien vuelva a abrir el enlace pasado ese tiempo la
        encuentra aquí, y a quien no vuelva se le recuerda con un aviso.
      */}
      {pedido.estado === 'entregado' && puedeResenar && (
        <Resena codigo={pedido.codigo} urlGoogle={urlGoogle} />
      )}

      {/* --- Volver a pedir --- */}
      {terminado && !cancelado && (
        <div className="mt-8 rounded-2xl border border-[#d97325]/30 bg-gradient-to-br from-[#d97325]/10 to-transparent p-6 text-center">
          <p className="font-display text-xl font-bold text-[#f5f1ea]">¿Te gustó?</p>
          <p className="mt-2 text-sm text-[#c9bfb2]">
            La próxima vez son dos toques.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d97325] px-8 font-semibold text-[#12100e]"
          >
            Pedir otra vez
          </Link>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-[#8f8479]">
        Guarda este enlace para volver a ver tu pedido.
      </p>
    </div>
  );
}
