'use client';

/**
 * ============================================================================
 * Checkout
 * ============================================================================
 *
 * Solo se pide lo imprescindible para entregar: nombre, teléfono y —si es a
 * domicilio— dirección. Nada de correo, contraseña ni registro. Cada campo de
 * más es una razón para abandonar, y aquí ya está todo decidido salvo pulsar.
 *
 * El teléfono se guarda en el navegador para la próxima vez. No es una cuenta:
 * es no volver a preguntar lo que ya contestó.
 *
 * Sobre los pagos: hoy solo se registra la INTENCIÓN de pago, nunca el cobro.
 * El pedido nace con estado_pago 'pendiente' y así se queda hasta que alguien
 * lo confirme desde el CRM. Marcar 'aprobado' aquí sería mentir: nadie ha
 * cobrado nada todavía. Cuando se integre una pasarela real será ella quien lo
 * cambie, y por eso el estado del pago vive en un campo aparte del estado del
 * pedido.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { escribir, useAlmacen } from '@/lib/almacen';
import { unitarioDe, useCarrito } from './Carrito';
import { precio } from '@/lib/formato';
import { ENVIO_COP, TIEMPOS } from '@/lib/envio';
import { ALMACEN_PALADAR } from './Paladar';
import type { Perfil } from '@/lib/paladar';
import { origenDeLaVisita } from '@/lib/atribucion';

type TipoEntrega = 'domicilio' | 'recoger' | 'mesa';

/**
 * Medios de pago.
 *
 * Los marcados `enLinea` cobran de verdad a través de Wompi: al confirmar, la
 * persona va al checkout de la pasarela y vuelve. Los demás se acuerdan por
 * WhatsApp y se cobran en mano.
 *
 * El orden importa: primero lo que cobra solo. Cada pedido contra entrega es un
 * cobro que alguien tiene que perseguir, y un porcentaje que no se cobra nunca.
 */
const PAGOS = [
  { id: 'tarjeta', etiqueta: 'Tarjeta', nota: 'Débito o crédito', enLinea: true },
  { id: 'nequi', etiqueta: 'Nequi', nota: 'Pagas ahora', enLinea: true },
  { id: 'pse', etiqueta: 'PSE', nota: 'Desde tu banco', enLinea: true },
  { id: 'efectivo', etiqueta: 'Efectivo', nota: 'Pagas al recibir', enLinea: false },
] as const;

/** Si el método cobra en línea, hay que pasar por la pasarela antes de acabar. */
function cobraEnLinea(id: string): boolean {
  return PAGOS.find((p) => p.id === id)?.enLinea ?? false;
}

const PROPINAS = [0, 2_000, 3_000, 5_000];

const ALMACEN_DATOS = 'bocazo:datos:v1';

export default function Checkout({
  mesa,
}: {
  /** Contexto de mesa, si la persona llegó por el QR del local. */
  mesa: { qrToken: string; mesa: string; local: string } | null;
}) {
  const router = useRouter();
  const { lineas, subtotalCOP, cargado, vaciar } = useCarrito();

  // Con contexto de mesa se arranca en 'mesa': es lo que casi siempre quiere
  // quien está sentado en el local, y ahorra un toque en el paso donde menos
  // conviene añadir fricción.
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>(mesa ? 'mesa' : 'domicilio');

  // El paladar se manda con el pedido, no antes: preguntarle el gusto a alguien
  // y enviarlo a un servidor sin que haya comprado nada es recoger datos porque
  // sí.
  const paladar = useAlmacen<Perfil>(ALMACEN_PALADAR);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [metodoPago, setMetodoPago] = useState<string>('tarjeta');
  const [propina, setPropina] = useState(0);
  const [notas, setNotas] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se recuerdan los datos de la última vez. La recompra es donde se gana un
  // negocio de comida, y volver a teclear la dirección entera es exactamente
  // el punto donde la gente decide pedir por WhatsApp en vez de por aquí.
  //
  // Se leen con useSyncExternalStore y se aplican como valor de reserva, no con
  // un efecto que llame a setState: eso provocaría un render en cascada y
  // pintaría los campos vacíos antes de rellenarlos.
  const recordados = useAlmacen<{
    nombre?: string;
    telefono?: string;
    direccion?: string;
    indicaciones?: string;
  }>(ALMACEN_DATOS);

  // Los campos son "no tocados" hasta que la persona escribe. Mientras tanto
  // muestran lo recordado; después, lo que ella haya puesto.
  const vNombre = nombre || recordados?.nombre || '';
  const vTelefono = telefono || recordados?.telefono || '';
  const vDireccion = direccion || recordados?.direccion || '';
  const vIndicaciones = indicaciones || recordados?.indicaciones || '';

  useEffect(() => {
    if (cargado && lineas.length === 0 && !enviando) router.replace('/carrito');
  }, [cargado, lineas.length, enviando, router]);

  if (!cargado || lineas.length === 0) return null;

  const envio = tipoEntrega === 'domicilio' ? ENVIO_COP : 0;
  const total = subtotalCOP + envio + propina;

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const r = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre: vNombre.trim(),
          telefono: vTelefono.trim(),
          tipoEntrega,
          direccion: tipoEntrega === 'domicilio' ? vDireccion.trim() : undefined,
          indicaciones: vIndicaciones.trim() || undefined,
          ...(tipoEntrega === 'mesa' && mesa ? { qrToken: mesa.qrToken } : {}),
          ...(paladar ? { paladar } : {}),
          // De dónde vino la visita. Se lee aquí, en el último paso, porque el
          // origen se fijó al entrar y este es el único momento en que se puede
          // pegar a algo permanente: si no viaja con el pedido, se pierde al
          // cerrar la pestaña y ya no lo recupera nadie.
          origen: origenDeLaVisita(),
          metodoPago,
          propinaCOP: propina,
          notas: notas.trim() || undefined,
          // Solo qué y cuánto. Los precios los pone el servidor.
          lineas: lineas.map((l) => ({
            slug: l.slug,
            cantidad: l.cantidad,
            opcionIds: l.opciones.map((o) => o.id),
            notas: l.notas,
          })),
        }),
      });

      const d = await r.json();

      if (!r.ok || !d.ok) {
        setError(d.error ?? 'No pudimos registrar tu pedido.');
        setEnviando(false);
        return;
      }

      escribir(ALMACEN_DATOS, {
        nombre: vNombre,
        telefono: vTelefono,
        direccion: vDireccion,
        indicaciones: vIndicaciones,
      });

      // El carrito se vacía DESPUÉS de que el servidor confirme. Vaciarlo antes
      // dejaría a la persona sin pedido y sin carrito si algo falla.
      // El carrito se vacía DESPUÉS de que el servidor confirme el pedido.
      // Vaciarlo antes dejaría a la persona sin pedido y sin carrito si algo
      // fallara.
      vaciar();

      // --- Cobro en línea ---
      // Con tarjeta, PSE o Nequi hay que pasar por Wompi. El pedido YA existe
      // en la base con el pago pendiente, así que si el cobro se cae por el
      // camino no se pierde: queda con un botón de reintentar en su
      // seguimiento.
      if (cobraEnLinea(metodoPago)) {
        try {
          const rp = await fetch('/api/pagar', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ codigo: d.codigo }),
          });
          const dp = await rp.json();

          if (dp.ok && dp.url) {
            // Se sale de la aplicación hacia el checkout de Wompi. La tarjeta
            // nunca pasa por nuestro servidor, que es lo que mantiene esto
            // fuera del alcance de PCI-DSS.
            window.location.href = dp.url;
            return;
          }

          // Si no se pudo abrir el cobro, el pedido existe igualmente: se lleva
          // al seguimiento, donde hay un botón para reintentar el pago.
        } catch {
          // Mismo caso: el pedido está guardado, el cobro se reintenta desde el
          // seguimiento.
        }
      }

      router.replace(`/pedido/${d.codigo}`);
    } catch {
      setError('Sin conexión. Comprueba tu internet e inténtalo otra vez.');
      setEnviando(false);
    }
  }

  const campo =
    'min-h-12 w-full rounded-xl border border-white/12 bg-[#1c1812] px-4 text-[#f5f1ea] placeholder:text-[#6b6258]';
  const etiqueta = 'mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#8f8479]';

  return (
    <form onSubmit={confirmar} className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-[#f5f1ea]">Confirmar pedido</h1>

      {/* --- Entrega --- */}
      <fieldset className="mt-6">
        <legend className={etiqueta}>¿Cómo lo quieres?</legend>
        <div className={`grid gap-3 ${mesa ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {(
            [
              ...(mesa
                ? ([{ id: 'mesa', titulo: 'A mi mesa', nota: `Mesa ${mesa.mesa}` }] as const)
                : []),
              { id: 'domicilio', titulo: 'A domicilio', nota: TIEMPOS.domicilio },
              { id: 'recoger', titulo: 'Lo recojo', nota: TIEMPOS.recoger },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setTipoEntrega(o.id)}
              aria-pressed={tipoEntrega === o.id}
              className={`min-h-16 rounded-xl border px-4 py-3 text-left transition-colors ${
                tipoEntrega === o.id
                  ? 'border-[#d97325] bg-[#d97325]/12'
                  : 'border-white/12'
              }`}
            >
              <span className="block font-semibold text-[#f5f1ea]">{o.titulo}</span>
              <span className="block text-xs text-[#8f8479]">{o.nota}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* --- Quién --- */}
      <div className="mt-6 space-y-4">
        <div>
          <label className={etiqueta} htmlFor="nombre">Tu nombre</label>
          <input
            id="nombre" required value={vNombre} onChange={(e) => setNombre(e.target.value)}
            autoComplete="name" maxLength={150} className={campo}
          />
        </div>

        <div>
          <label className={etiqueta} htmlFor="telefono">WhatsApp</label>
          <input
            id="telefono" required value={vTelefono} onChange={(e) => setTelefono(e.target.value)}
            type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567"
            className={campo}
          />
          <p className="mt-1.5 text-xs text-[#8f8479]">
            Por aquí te confirmamos y te avisamos cuando salga.
          </p>
        </div>

        {tipoEntrega === 'domicilio' && (
          <>
            <div>
              <label className={etiqueta} htmlFor="direccion">Dirección</label>
              <input
                id="direccion" required value={vDireccion}
                onChange={(e) => setDireccion(e.target.value)}
                autoComplete="street-address" maxLength={255}
                placeholder="Carrera 7 # 63-44" className={campo}
              />
            </div>
            <div>
              <label className={etiqueta} htmlFor="indicaciones">
                Indicaciones para el repartidor
              </label>
              <input
                id="indicaciones" value={vIndicaciones}
                onChange={(e) => setIndicaciones(e.target.value)}
                maxLength={255} placeholder="Apto 502, torre B, portería"
                className={campo}
              />
            </div>
          </>
        )}
      </div>

      {/* --- Pago --- */}
      <fieldset className="mt-7">
        <legend className={etiqueta}>Cómo pagas</legend>
        <div className="grid grid-cols-2 gap-3">
          {PAGOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setMetodoPago(p.id)}
              aria-pressed={metodoPago === p.id}
              className={`min-h-16 rounded-xl border px-4 py-3 text-left transition-colors ${
                metodoPago === p.id ? 'border-[#d97325] bg-[#d97325]/12' : 'border-white/12'
              }`}
            >
              <span className="block font-semibold text-[#f5f1ea]">{p.etiqueta}</span>
              <span className="block text-xs text-[#8f8479]">{p.nota}</span>
            </button>
          ))}
        </div>
        {/* Se dice EXACTAMENTE qué va a pasar al pulsar. La duda "¿me van a
            cobrar ahora o después?" es la que más frena en el último paso, y
            responderla cuesta una línea. */}
        <p className="mt-3 text-xs leading-relaxed text-[#8f8479]">
          {cobraEnLinea(metodoPago)
            ? 'Al confirmar te llevamos a la pasarela segura de Wompi. Tus datos de pago no pasan por nosotros.'
            : 'No se cobra nada ahora. Confirmamos por WhatsApp y pagas al recibir.'}
        </p>
      </fieldset>

      {/* --- Propina --- */}
      <fieldset className="mt-7">
        <legend className={etiqueta}>¿Propina para quien lo prepara?</legend>
        <div className="flex gap-2">
          {PROPINAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPropina(p)}
              aria-pressed={propina === p}
              className={`min-h-11 flex-1 rounded-full border text-sm font-medium transition-colors ${
                propina === p
                  ? 'border-[#d97325] bg-[#d97325]/12 text-[#f5f1ea]'
                  : 'border-white/12 text-[#c9bfb2]'
              }`}
            >
              {p === 0 ? 'No' : precio(p)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-7">
        <label className={etiqueta} htmlFor="notas">Algo más que debamos saber</label>
        <input
          id="notas" value={notas} onChange={(e) => setNotas(e.target.value)}
          maxLength={500} placeholder="Opcional" className={campo}
        />
      </div>

      {/* --- Resumen --- */}
      <dl className="mt-8 space-y-2 rounded-2xl border border-white/10 bg-[#1c1812] p-5">
        {lineas.map((l) => (
          <div key={l.clave} className="flex justify-between gap-3 text-sm text-[#c9bfb2]">
            <dt className="min-w-0">
              {l.cantidad} × {l.nombre}
            </dt>
            <dd className="shrink-0">{precio(unitarioDe(l) * l.cantidad)}</dd>
          </div>
        ))}

        <div className="flex justify-between border-t border-white/10 pt-2 text-sm text-[#c9bfb2]">
          <dt>{tipoEntrega === 'mesa' ? 'Entrega' : 'Domicilio'}</dt>
          <dd>
            {tipoEntrega === 'mesa'
              ? `Mesa ${mesa?.mesa ?? ''}`
              : envio === 0
                ? 'Recoges tú'
                : precio(envio)}
          </dd>
        </div>

        {propina > 0 && (
          <div className="flex justify-between text-sm text-[#c9bfb2]">
            <dt>Propina</dt>
            <dd>{precio(propina)}</dd>
          </div>
        )}

        <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-[#f5f1ea]">
          <dt>Total</dt>
          <dd className="font-display">{precio(total)}</dd>
        </div>
      </dl>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-[#d97325] px-8 text-lg font-semibold text-[#12100e] transition-transform active:scale-[0.99] disabled:opacity-70"
      >
        {enviando
          ? cobraEnLinea(metodoPago)
            ? 'Llevándote al pago…'
            : 'Enviando…'
          : cobraEnLinea(metodoPago)
            ? `Pagar ${precio(total)}`
            : `Confirmar pedido · ${precio(total)}`}
      </button>
    </form>
  );
}
