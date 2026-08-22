/** Precio en pesos, como se escribe en Colombia. */
export function precio(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

/**
 * Cargador de imágenes de producto.
 *
 * Igual que en la landing y por el mismo motivo: en Cloudflare Workers el
 * optimizador de Next no redimensiona, solo reenvía el fichero. Las variantes
 * por ancho se generan de antemano y aquí se elige la que toca.
 */
const ANCHOS = [480, 760, 1100] as const;

export default function cargadorImagen({ src, width }: { src: string; width: number }): string {
  if (/^\/conos\/[\w-]+\.webp$/.test(src)) {
    const base = src.replace(/\.webp$/, '');
    const elegido = ANCHOS.find((w) => w >= width) ?? ANCHOS[ANCHOS.length - 1];
    return `${base}-${elegido}.webp`;
  }
  return src;
}
