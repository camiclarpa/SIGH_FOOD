/**
 * ============================================================================
 * Cargador de imágenes de la aplicación
 * ============================================================================
 *
 * Se registra en next.config.js (images.loader = 'custom' + loaderFile) y
 * sustituye al optimizador de Next en TODA la aplicación.
 *
 * POR QUÉ existe
 * --------------
 * Se comprobó contra el preview real de Cloudflare Workers, que es donde vive
 * esta landing: /_next/image?w=1080 devuelve 190336 bytes — exactamente el
 * tamaño del fichero original. El optimizador no redimensiona nada ahí, solo
 * reenvía el archivo tras un salto de más.
 *
 * Sin hacer nada, un móvil se descargaba la foto de 1100 px para pintarla a
 * 375. En una página cuyo único objetivo es que la gente se quede mirando, eso
 * son cientos de kilobytes tirados en la primera pantalla y con datos móviles.
 *
 * La solución es no depender del optimizador: las variantes se generan de
 * antemano (scripts/optimizar-conos.py) y aquí se elige la que toca. El
 * navegador sigue construyendo su srcset y escogiendo según viewport y densidad
 * de pantalla; solo que ahora apunta a ficheros que existen de verdad.
 *
 * POR QUÉ va aquí y no como prop `loader`
 * ---------------------------------------
 * Pasar la función por prop obliga a que TODOS los componentes que muestran una
 * imagen sean de cliente: `<Image>` es un componente de cliente y React no deja
 * cruzar funciones desde el servidor ("Functions cannot be passed directly to
 * Client Components"). Registrarlo en la configuración lo aplica a los dos
 * mundos sin marcar como cliente componentes que no lo necesitan.
 */

/** Anchos generados para las fotos de producto. */
const ANCHOS_CONOS = [480, 760, 1100] as const;

interface Parametros {
  src: string;
  width: number;
  quality?: number;
}

export default function cargadorImagen({ src, width }: Parametros): string {
  // Las fotos de los conos tienen variantes por ancho.
  if (/^\/conos\/[\w-]+\.webp$/.test(src)) {
    const base = src.replace(/\.webp$/, '');
    // Se redondea hacia ARRIBA: servir una imagen más pequeña que su hueco la
    // deja borrosa, y una foto de comida borrosa no vende. Pasarse un poco solo
    // cuesta unos kilobytes.
    const elegido = ANCHOS_CONOS.find((w) => w >= width) ?? ANCHOS_CONOS[ANCHOS_CONOS.length - 1];
    return `${base}-${elegido}.webp`;
  }

  // Cualquier otra imagen —las de la landing B2B, por ejemplo— se sirve tal
  // cual. Un cargador personalizado sustituye al optimizador para toda la
  // aplicación, así que tiene que saber no romper lo que no conoce.
  return src;
}
