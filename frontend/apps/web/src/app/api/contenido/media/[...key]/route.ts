// =============================================================================
// Sirve de vuelta un archivo subido a la biblioteca de Contenido
// =============================================================================
//
// El archivo pasa siempre por el propio Worker en vez de por el dominio
// público r2.dev: mismo dominio que el resto del CRM, mismas cabeceras, y no
// hay que habilitar un segundo subdominio de Cloudflare para esto.
//
// [...key] y no [key]: la clave real lleva una barra ("contenido/uuid.jpg"),
// y un segmento simple de Next no la deja pasar entera.

import { NextRequest, NextResponse } from 'next/server';
import { contextoCloudflare } from '@/lib/cloudflare';
import { actorActual } from '@/lib/permisos';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';

interface CuboR2 {
  get(key: string): Promise<{
    body: ReadableStream;
    httpMetadata?: { contentType?: string };
  } | null>;
}

export const GET = conTrazas('/api/contenido/media/[...key]', async (
  request: NextRequest,
  contexto: { params: Promise<{ key: string[] }> }
) => {
  try {
    // Ver una miniatura es lectura, no gestión: cualquiera con sesión en el
    // CRM puede pedirla, no hace falta el permiso de gestionar contenido.
    const actor = await actorActual();
    if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { key } = await contexto.params;
    const clave = key.join('/');

    // Solo lo que este endpoint pudo haber subido: evita que la ruta se use
    // para pedir cualquier objeto del bucket por adivinanza de nombre.
    if (!clave.startsWith('contenido/')) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const { env } = await contextoCloudflare();
    const bucket = (env as unknown as { MEDIA?: CuboR2 })?.MEDIA;
    if (!bucket) return NextResponse.json({ error: 'No disponible' }, { status: 503 });

    const objeto = await bucket.get(clave);
    if (!objeto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    return new NextResponse(objeto.body, {
      headers: {
        'Content-Type': objeto.httpMetadata?.contentType ?? 'application/octet-stream',
        // Un año: la clave lleva un UUID, así que el mismo nombre nunca cambia
        // de contenido. Si se sube un archivo distinto, sube con OTRA clave.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    log.error('Fallo al servir archivo de contenido', e, { ruta: '/api/contenido/media' });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
});
