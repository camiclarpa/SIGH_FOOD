'use client';

// =============================================================================
// QR del enlace de un embajador
// =============================================================================
//
// Mismo patrón que VistaQr.tsx en Códigos QR: se genera en el propio
// navegador con `qrcode`, sin depender de ningún servicio externo.

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function QrEmbajador({ url, alias }: { url: string; alias: string }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 512 })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  async function descargarPng() {
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 1024 });
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = `qr-embajador-${alias.toLowerCase().replace(/\s+/g, '-')}.png`;
    enlace.click();
  }

  async function descargarSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `qr-embajador-${alias.toLowerCase().replace(/\s+/g, '-')}.svg`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className="texto-suave text-xs hover:underline"
      >
        QR
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(22rem,90vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
      >
        <div className="p-5 text-center">
          <h2 className="mb-3 text-sm font-semibold">Enlace de {alias}</h2>
          {svg ? (
            <div className="mx-auto w-56 rounded-lg bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="texto-suave text-xs">Generando…</p>
          )}
          <p className="texto-suave mt-3 break-all text-[10px]">{url}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={descargarSvg} className="rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              SVG
            </button>
            <button type="button" onClick={descargarPng} className="rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              PNG
            </button>
          </div>

          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="mt-4 text-xs text-orange-600 hover:underline dark:text-orange-400"
          >
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}
