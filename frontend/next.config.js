/**
 * ============================================================================
 * NEXT.CONFIG.JS — Optimizaciones de Rendimiento (RFC-HPBN)
 * ============================================================================
 * 
 * Este archivo aplica los principios de "Web Performance Tuning" de Patrick
 * Killelea (O'Reilly 1998) al stack moderno de Next.js 14+ / Astro 4+.
 * 
 * PRINCIPIOS APLICADOS:
 * ──────────────────────────────────────────────────────────────────────────
 * 
 * CAPÍTULO 1: The Blunt Instruments
 *   • formats: ['image/avif', 'image/webp'] — equivalente moderno a "apagar
 *     GIF/JPEG pesados"
 *   • deviceSizes: srcset responsive automático
 *   • minimumCacheTTL: 31536000 (1 año) — equivalente a "no verificar frescura"
 *   • compress: true (Brotli) — "Bits Are Cost" (Principio 5.1.14)
 *   • poweredByHeader: false — elimina header innecesario
 * 
 * CAPÍTULO 14: Content
 *   • AVIF para fotos de producto (mejor ratio compresión/calidad)
 *   • WebP como fallback universal
 *   • quality: 80 (balance entre compresión y calidad visual)
 * 
 * CAPÍTULO 10: Network Protocols
 *   • Headers Cache-Control agresivos en assets estáticos
 *   • Alt-Svc: h3=":443" anuncia soporte HTTP/3
 * 
 * AUTHOR'S TIPS:
 *   • Tip #1: Usar versión más reciente del framework (Next.js 14+)
 *   • Tip #4: Mantener contenido lo más pequeño posible
 *   • Tip #5: Preprocesar contenido fuera de línea (SSG)
 *   • Tip #10: Configurar trailingSlash explícitamente
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Sección 1.3: Código de ejemplo next.config.js
 *   • Sección 10.3: Headers HTTP para Caching y Compresión
 *   • Sección 14.2: Tabla de Formatos de Imagen
 *   • Apéndice B: Apache Performance Notes → Next.js
 * ============================================================================
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // =========================================================================
  // OPTIMIZACIONES BÁSICAS (Capítulo 1: Blunt Instruments)
  // =========================================================================
  
  // Eliminar header X-Powered-By: Next.js (reduce bytes en cada respuesta)
  poweredByHeader: false,
  
  // Compresión Brotli automática (más eficiente que gzip)
  // Principio 5.1.14: Bits Are Cost
  compress: true,
  
  // Modo estricto de React para detectar problemas en desarrollo
  reactStrictMode: true,
  
  // =========================================================================
  // OPTIMIZACIONES DE IMAGEN (Capítulo 14: Content)
  // =========================================================================
  
  images: {
    // Formatos modernos: AVIF (primario) + WebP (fallback)
    // AVIF ofrece 30-50% menor tamaño que JPEG a igual calidad
    formats: ['image/avif', 'image/webp'],
    
    // Tamaños para srcset responsive
    // El navegador elige el tamaño óptimo según el viewport
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Cache de imágenes: 1 año (31536000 segundos)
    // Equivalente a "no verificar frescura del documento cacheado" (Cap. 1)
    minimumCacheTTL: 31536000,
    
    // No permitir SVG (pueden ser pesados y no se optimizan bien)
    dangerouslyAllowSVG: false,
    
    // Forzar descarga en vez de inline para SVGs permitidos
    contentDispositionType: 'attachment',
  },
  
  // =========================================================================
  // OPTIMIZACIONES DE BUILD (Author's Tips #1, #4, #5)
  // =========================================================================
  
  // Usar SWC (Rust) en vez de Babel/Terser — más rápido en build
  // Tip #1: Usar versión más reciente del framework
  // No generar source maps en producción (reduce Page Weight)
  // Tip #4: Mantener contenido lo más pequeño posible
  productionBrowserSourceMaps: false,
  
  // =========================================================================
  // OPTIMIZACIONES EXPERIMENTALES
  // =========================================================================
  
  experimental: {
    // Optimizar imports de paquetes grandes (ej: lucide-react)
    // Equivalente a "apagar Java no necesario" (Cap. 1)
    // // optimizePackageImports: ['lucide-react', '@heroicons/react'] - Deshabilitado temporalmente - Next.js 16 lo habilita por defecto - Deshabilitado temporalmente - Next.js 16 lo habilita por defecto,
    
    // Scroll restoration nativo del navegador
    scrollRestoration: true,
    
    // Optimización de CSS (elimina CSS no usado)
    // Tip #5: Preprocesar contenido fuera de línea
    optimizeCss: true,
  },
  
  // =========================================================================
  // HEADERS HTTP (Capítulo 10: Network Protocols)
  // =========================================================================
  
      async headers() {
    return [
      // -----------------------------------------------------------------
      // Cabeceras de seguridad: aplican a TODO, incluidas las rutas de API.
      // -----------------------------------------------------------------
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },

      // -----------------------------------------------------------------
      // API: nunca cacheable.
      //
      // Antes caía bajo la regla de abajo y salía con
      // `public, max-age=31536000, immutable`. Eso permitía que un CDN o un
      // proxy intermedio guardara la respuesta de un usuario y se la sirviera
      // a otro. `private, no-store` lo impide de raíz.
      // -----------------------------------------------------------------
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },

      // -----------------------------------------------------------------
      // Assets con hash en el nombre: sí son inmutables de verdad.
      // -----------------------------------------------------------------
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },

      // -----------------------------------------------------------------
      // Páginas HTML: cacheables en el CDN, pero revalidables.
      //
      // `immutable` durante un año significaba que al cambiar un precio o un
      // texto, quien ya hubiera visitado la página no volvería a verla nunca:
      // el navegador ni siquiera revalidaba. Con stale-while-revalidate el
      // usuario recibe la versión cacheada al instante y el CDN refresca por
      // detrás.
      // -----------------------------------------------------------------
      {
        source: '/((?!_next/|api/|assets/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
  
  // =========================================================================
  // REDIRECTS Y REWRITES (Author's Tip #10)
  // =========================================================================
  
  // Configurar trailingSlash explícitamente
  // Tip #10: Evitar redirección 308 innecesaria
  trailingSlash: false,
  
  // =========================================================================
  // TIPOSCRIPT Y ESLINT
  // =========================================================================
  
  typescript: {
    // No ignorar errores de TypeScript en build
    ignoreBuildErrors: false,
  },

  // =========================================================================
  // BUNDLERS
  // =========================================================================

  // `next build` usa webpack (ver el flag --webpack del script).
  //
  // La caché persistente de webpack en .next/cache se corrompe de forma
  // intermitente en este proyecto: al reutilizarla, algún módulo llega al
  // hasher con `undefined` y el build muere antes de compilar. Se manifiesta
  // de dos formas según el algoritmo de hash:
  //   · xxhash64 (por defecto): "Cannot read properties of undefined
  //     (reading 'length') at WasmHash._updateWithBuffer"
  //   · sha256: "The 'data' argument must be of type string... Received
  //     undefined" (ERR_INVALID_ARG_TYPE)
  // Es el mismo fallo con distinta cara, y no depende de la versión de Node:
  // se reprodujo en la 22 y en la 24. Cambiar el hash solo cambia el mensaje.
  //
  // Desactivar la caché lo elimina de raíz. El coste es compilar siempre en
  // frío (~13 s aquí), que es lo que ocurre igualmente en CI, donde no hay
  // caché previa. `next dev` con Turbopack no se ve afectado.
  webpack: (config) => {
    config.cache = false;
    return config;
  },

  // `next dev` usa Turbopack, que rechaza convivir con un `webpack` sin una
  // config propia declarada. Este objeto vacío es justo lo que la propia
  // advertencia de Next sugiere para dejar clara la intención.
  turbopack: {},

  };

module.exports = nextConfig;