'use client';

// =============================================================================
// Vista previa e impresión de un código QR
// =============================================================================
//
// Genera el QR en el propio navegador con `qrcode` (SVG y PNG), y ofrece
// descargar cada formato o mandarlo a imprimir. No hay servicio externo de por
// medio: la URL de cada mesa no sale del navegador de quien la está viendo.

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function VistaQr({
  url,
  etiqueta,
  subtitulo,
}: {
  url: string;
  /** Lo que se lee bajo el QR al imprimir: "Mesa 4", por ejemplo. */
  etiqueta: string;
  subtitulo?: string;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 512 })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [url]);

  async function descargarSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = `qr-${etiqueta.toLowerCase().replace(/\s+/g, '-')}.svg`;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  async function descargarPng() {
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 1024 });
    const enlace = document.createElement('a');
    enlace.href = dataUrl;
    enlace.download = `qr-${etiqueta.toLowerCase().replace(/\s+/g, '-')}.png`;
    enlace.click();
  }

  function imprimir() {
    const ventana = window.open('', '_blank', 'width=420,height=560');
    if (!ventana || !svg) return;
    ventana.document.write(`<!doctype html><html><head><title>${etiqueta}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center;
               height:100vh; margin:0; font-family:system-ui,sans-serif; }
        svg { width:70vw; max-width:320px; }
        h1 { font-size:1.1rem; margin:1rem 0 0; }
        p { font-size:0.85rem; color:#555; margin:0.15rem 0 0; }
        @media print { @page { margin: 1cm; } }
      </style></head><body>
        ${svg}
        <h1>${etiqueta}</h1>
        ${subtitulo ? `<p>${subtitulo}</p>` : ''}
        <script>window.onload = () => window.print();</script>
      </body></html>`);
    ventana.document.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogo.current?.showModal()}
        className="texto-suave text-xs hover:underline"
      >
        Ver QR
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(22rem,90vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
      >
        <div className="p-5 text-center">
          <h2 className="mb-3 text-sm font-semibold">{etiqueta}</h2>
          {svg ? (
            <div
              className="mx-auto w-56 rounded-lg bg-white p-3"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
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
            <button type="button" onClick={imprimir} className="rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              Imprimir
            </button>
          </div>

          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className="mt-4 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}
