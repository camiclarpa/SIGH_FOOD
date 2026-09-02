'use client';

// =============================================================================
// Consola de redención en mesa
// =============================================================================
//
// El personal teclea el código que enseña el comensal, o lo escanea con la
// cámara del móvil, y el sistema decide. Deliberadamente poco más hay en
// pantalla: se usa de pie, con prisa y con el comensal esperando delante.
//
// EL SELECTOR DE LOCAL NO ES DECORATIVO
// --------------------------------------
// `entregarCanje` siempre aceptó un `accountId` para dejar rastro de en qué
// local se entregó cada premio, pero esta consola nunca lo mandaba: todo canje
// entregado hasta ahora quedó con "punto de venta" vacío en el historial. Con
// más de un local, esa columna es la única forma de saber cuál mueve más
// premios.

import { useEffect, useRef, useState, useTransition } from 'react';
import { entregarCanje } from '@/lib/acciones/canjes';

type Estado =
  | { tipo: 'inactivo' }
  | { tipo: 'ok'; premio: string; comensal: string | null }
  | { tipo: 'error'; mensaje: string };

interface Cuenta {
  id: string;
  nombre: string;
}

/**
 * Escaneo por cámara con el detector nativo del navegador.
 *
 * Sin librería: BarcodeDetector ya trae la cámara y la decodificación del QR.
 * Donde no existe —sobre todo Safari— el botón de "Escanear" simplemente no
 * aparece y queda el campo de texto, que siempre funciona.
 */
function useEscanerQr(alDetectar: (texto: string) => void) {
  const [disponible, setDisponible] = useState(false);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const cuadro = useRef<number | null>(null);

  useEffect(() => {
    setDisponible(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  function detener() {
    if (cuadro.current) cancelAnimationFrame(cuadro.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setActivo(false);
  }

  async function iniciar() {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.current = media;
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      setActivo(true);

      // @ts-expect-error BarcodeDetector no tiene tipos en TS todavía.
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const leer = async () => {
        if (!video.current || video.current.readyState < 2) {
          cuadro.current = requestAnimationFrame(leer);
          return;
        }
        try {
          const codigos = await detector.detect(video.current);
          if (codigos[0]?.rawValue) {
            alDetectar(codigos[0].rawValue);
            detener();
            return;
          }
        } catch {
          // Un frame ilegible no es un fallo: se reintenta con el siguiente.
        }
        cuadro.current = requestAnimationFrame(leer);
      };
      cuadro.current = requestAnimationFrame(leer);
    } catch {
      setError('No se pudo abrir la cámara. Revisa el permiso del navegador.');
      setActivo(false);
    }
  }

  useEffect(() => () => detener(), []);

  return { disponible, activo, error, video, iniciar, detener };
}

export function ConsolaRedencion({ puedeEntregar, cuentas }: { puedeEntregar: boolean; cuentas: Cuenta[] }) {
  const [codigo, setCodigo] = useState('');
  const [accountId, setAccountId] = useState(cuentas[0]?.id ?? '');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inactivo' });
  const [enCurso, iniciar] = useTransition();

  const escaner = useEscanerQr((texto) => {
    // Un QR de premio guarda solo el código; si alguien apunta a otro QR
    // (una mesa, por ejemplo) esto simplemente no encontrará un canje y el
    // servidor lo dirá con claridad, en vez de fallar en silencio.
    setCodigo(texto.trim().toUpperCase());
  });

  function entregar(codigoAEnviar: string) {
    if (!codigoAEnviar.trim()) return;
    iniciar(async () => {
      const r = await entregarCanje({ codigo: codigoAEnviar, accountId: accountId || undefined });
      if (r.ok && r.datos) {
        setEstado({ tipo: 'ok', premio: r.datos.premio, comensal: r.datos.comensal });
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
      {cuentas.length > 0 && (
        <div className="mb-3">
          <label className="texto-suave mb-1 block text-xs font-medium" htmlFor="cuenta-redencion">
            Punto de venta
          </label>
          <select
            id="cuenta-redencion"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="superficie w-full max-w-xs rounded-md border borde-tema px-3 py-2 text-sm"
          >
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); entregar(codigo); }} className="flex flex-wrap gap-2">
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
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {enCurso ? 'Comprobando…' : 'Entregar'}
        </button>
        {escaner.disponible && (
          <button
            type="button"
            onClick={() => (escaner.activo ? escaner.detener() : escaner.iniciar())}
            className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {escaner.activo ? 'Cerrar cámara' : '📷 Escanear'}
          </button>
        )}
      </form>

      {escaner.activo && (
        <div className="mt-3 overflow-hidden rounded-md border borde-tema">
          <video ref={escaner.video} muted playsInline className="aspect-video w-full max-w-sm bg-black" />
        </div>
      )}
      {escaner.error && <p className="mt-2 text-xs text-red-500">{escaner.error}</p>}

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
