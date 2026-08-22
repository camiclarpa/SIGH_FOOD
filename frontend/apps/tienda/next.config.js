/**
 * Config propia de @sighfood/web.
 *
 * Sin este archivo, Next sube por el árbol y toma el `next.config.js` de la
 * raíz del workspace — que está afinado para la landing y trae un `webpack`
 * personalizado que Turbopack rechaza.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    // Cargador propio en lugar del optimizador de Next: medido contra el
    // preview real de Workers, /_next/image devuelve el fichero entero sin
    // redimensionar. Las variantes se generan de antemano.
    loader: 'custom',
    loaderFile: './src/lib/formato.ts',
  },
};

module.exports = nextConfig;
