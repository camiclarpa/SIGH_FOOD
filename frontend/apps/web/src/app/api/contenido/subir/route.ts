// =============================================================================
// Subida de un archivo a la biblioteca de Contenido
// =============================================================================
//
// Antes de esto, una pieza solo podía llevar un enlace a donde ya estuviera
// publicada (Instagram, TikTok). Esto sirve para el otro caso: subir el
// archivo ANTES de publicarlo en ningún lado, para revisarlo desde el CRM.
//
// Sube primero, guarda la pieza después. El editor llama a este endpoint al
// elegir un archivo, recibe la clave, y esa clave viaja como un campo más del
// formulario normal — así guardarContenido() no tiene que saber nada de R2.

import { NextRequest, NextResponse } from 'next/server';
import { contextoCloudflare } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';

/** Lo mínimo del binding R2 que se usa aquí. Ver la nota de KV en lib/respaldo.ts: mismo patrón. */
interface CuboR2 {
  put(key: string, value: ArrayBuffer, opciones?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
]);

/** 25 MB: suficiente para un vídeo corto de mesa, poco para que alguien llene el bucket sin querer. */
const TAMANO_MAXIMO = 25 * 1024 * 1024;

export const POST = conTrazas('/api/contenido/subir', async (request: NextRequest) => {
  try {
    await exigir('contenido.gestionar');

    const form = await request.formData();
    const archivo = form.get('archivo');
    if (!(archivo instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 });
    }
    if (!TIPOS_PERMITIDOS.has(archivo.type)) {
      return NextResponse.json(
        { ok: false, error: `Tipo de archivo no admitido: ${archivo.type || 'desconocido'}. Solo imágenes y vídeo corto.` },
        { status: 400 }
      );
    }
    if (archivo.size > TAMANO_MAXIMO) {
      return NextResponse.json({ ok: false, error: 'El archivo pesa más de 25 MB' }, { status: 400 });
    }

    const { env } = await contextoCloudflare();
    const bucket = (env as unknown as { MEDIA?: CuboR2 })?.MEDIA;
    if (!bucket) {
      return NextResponse.json({ ok: false, error: 'El almacenamiento de archivos no está disponible aquí' }, { status: 503 });
    }

    const extension = archivo.name.includes('.') ? archivo.name.split('.').pop()!.toLowerCase().slice(0, 10) : 'bin';
    const key = `contenido/${crypto.randomUUID()}.${extension}`;

    await bucket.put(key, await archivo.arrayBuffer(), {
      httpMetadata: { contentType: archivo.type },
    });

    log.info('Archivo de contenido subido', { ruta: '/api/contenido/subir', detalle: [key, archivo.type] });
    return NextResponse.json({ ok: true, key, tipo: archivo.type });
  } catch (e) {
    if (e instanceof SinPermiso) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    }
    log.error('Fallo al subir archivo de contenido', e, { ruta: '/api/contenido/subir' });
    return NextResponse.json({ ok: false, error: 'No se pudo subir el archivo' }, { status: 500 });
  }
});
