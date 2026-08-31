// =============================================================================
// SIGH_FOOD - Material POP imprimible de los códigos QR
// Endpoint: GET /api/qr/imprimir?account_id=…
// =============================================================================
//
// Devuelve una hoja HTML lista para imprimir o guardar como PDF desde el propio
// navegador. No se genera un PDF en el servidor a propósito: exigiría una
// librería pesada dentro del Worker para conseguir lo mismo que el diálogo de
// impresión ya hace, y con menos control sobre el tamaño real del papel.
//
// Los QR van en SVG, no en PNG: un adhesivo de mesa se imprime a 5 cm y un
// mapa de bits se ve dentado a ese tamaño. El vector no.

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { and, asc, eq } from 'drizzle-orm';
import { accounts, qrCodes } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';

/** Escapa texto que se inserta en el HTML. Los nombres de bar los teclea alguien. */
function esc(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET = conTrazas('/api/qr/imprimir', async (request: NextRequest) => {
  try {
    const actor = await exigir('qr.gestionar');

    const accountId = request.nextUrl.searchParams.get('account_id');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Falta account_id' }, { status: 400 });
    }

    const base = request.nextUrl.origin;

    const datos = await conBaseDeDatos(async (db) => {
      const [bar] = await db
        .select({ nombre: accounts.name, zona: accounts.zone })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);
      if (!bar) return null;

      const codigos = await db
        .select({
          mesa: qrCodes.tableNumber,
          token: qrCodes.qrToken,
          destino: qrCodes.destinoUrl,
          activo: qrCodes.isActive,
        })
        .from(qrCodes)
        // Solo los activos: imprimir un QR desactivado llena la mesa de
        // adhesivos que no hacen nada.
        .where(and(eq(qrCodes.accountId, accountId), eq(qrCodes.isActive, true)))
        .orderBy(asc(qrCodes.tableNumber));

      return { bar, codigos };
    });

    if (!datos) {
      return NextResponse.json({ success: false, error: 'El bar no existe' }, { status: 404 });
    }
    if (datos.codigos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ese bar no tiene códigos QR activos' },
        { status: 404 }
      );
    }

    const tarjetas = (
      await Promise.all(
        datos.codigos.map(async (c) => {
          // El QR apunta SIEMPRE al escaneo propio, aunque haya redirección: así
          // el destino se cambia en la base y el adhesivo sigue valiendo. Meter la
          // URL final en el código es lo que obliga a reimprimir.
          const url = `${base}/m/${c.token}`;

          const svg = await QRCode.toString(url, {
            type: 'svg',
            margin: 0,
            width: 220,
            color: { dark: '#000000ff', light: '#ffffffff' },
            // Corrección alta: un adhesivo de mesa acaba con roces y manchas de
            // grasa, y con corrección baja deja de leerse.
            errorCorrectionLevel: 'H',
          });

          return `
        <article class="tarjeta">
          <p class="marca">SIGH_FOOD</p>
          <div class="qr">${svg}</div>
          <p class="mesa">${esc(c.mesa)}</p>
          <p class="bar">${esc(datos.bar.nombre)}</p>
          <p class="pie">Escanea y gana puntos</p>
        </article>`;
        })
      )
    ).join('');

    log.info('Material POP generado', {
      ruta: '/api/qr/imprimir',
      detalle: [actor.email, datos.bar.nombre, `${datos.codigos.length} códigos`],
    });

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>QR · ${esc(datos.bar.nombre)}</title>
<style>
  /* Márgenes de impresora reales, no los del navegador. */
  @page { size: A4; margin: 10mm; }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #fff;
    color: #000;
  }

  .cabecera { padding: 8mm 0 4mm; border-bottom: 1px solid #ddd; margin-bottom: 6mm; }
  .cabecera h1 { margin: 0; font-size: 16pt; }
  .cabecera p { margin: 2mm 0 0; font-size: 9pt; color: #666; }

  .hoja {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6mm;
  }

  .tarjeta {
    border: 1px dashed #999;      /* guía de corte */
    border-radius: 3mm;
    padding: 5mm 3mm;
    text-align: center;
    /* Que una tarjeta no se parta entre dos páginas. */
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .marca { margin: 0 0 3mm; font-size: 8pt; font-weight: 700; letter-spacing: .12em; }
  .qr svg { width: 100%; height: auto; max-width: 42mm; }
  .mesa { margin: 3mm 0 0; font-size: 15pt; font-weight: 700; }
  .bar  { margin: 1mm 0 0; font-size: 8pt; color: #555; }
  .pie  { margin: 2mm 0 0; font-size: 7pt; color: #888; }

  .instrucciones {
    margin-bottom: 6mm; padding: 4mm; border: 1px solid #ddd;
    border-radius: 2mm; font-size: 9pt; color: #444; background: #fafafa;
  }
  /* La ayuda es para la pantalla; en papel sobra. */
  @media print { .instrucciones { display: none; } }
</style>
</head>
<body>
  <div class="instrucciones">
    <strong>Para imprimir:</strong> Ctrl+P (o Cmd+P) y elige «Guardar como PDF».
    Activa «Gráficos de fondo» si tu navegador lo ofrece. Las líneas discontinuas
    son guías de corte y no se imprimen en color.
  </div>

  <div class="cabecera">
    <h1>${esc(datos.bar.nombre)}</h1>
    <p>${esc(datos.bar.zona ?? '')} · ${datos.codigos.length} mesas · generado el ${new Date().toLocaleDateString('es-CO')}</p>
  </div>

  <div class="hoja">${tarjetas}</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    if (e instanceof SinPermiso) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 });
    }
    log.error('Error generando material POP', e, { ruta: '/api/qr/imprimir' });
    return NextResponse.json({ success: false, error: 'Error generando el material' }, { status: 500 });
  }
});
