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
};

module.exports = nextConfig;
