# Checklist de Ajustes Lighthouse - SIGH_FOOD

## PERFORMANCE (< 100)

### Si LCP > 2.5s:
- [ ] Verificar que la imagen hero tenga \priority={true}\
- [ ] Reducir calidad de imagen a 85
- [ ] Usar formato WebP/AVIF
- [ ] Añadir \<link rel="preload">\ para la imagen LCP
- [ ] Verificar que el servidor esté en región cercana (iad1/gru1)

### Si TBT > 200ms:
- [ ] Identificar scripts bloqueantes con Lighthouse
- [ ] Mover analytics a \
ext/script\ con strategy="lazyOnload"
- [ ] Code split de componentes pesados con \
ext/dynamic\
- [ ] Reducir tamaño de bundles con \@next/bundle-analyzer\

### Si CLS > 0.1:
- [ ] Añadir width/height explícitos a todas las imágenes
- [ ] Usar \spect-ratio\ en CSS para contenedores
- [ ] Reservar espacio para ads/embeds
- [ ] Evitar insertar contenido dinámico arriba del fold

### Si FCP > 1.8s:
- [ ] Reducir tamaño del HTML inicial
- [ ] Inline critical CSS
- [ ] Preconnect a dominios externos
- [ ] Minimizar redirects

## ACCESSIBILITY (< 100)

### Problemas comunes:
- [ ] Añadir \lt\ descriptivo a todas las imágenes
- [ ] Usar \<label>\ para todos los inputs
- [ ] Asegurar contraste mínimo 4.5:1
- [ ] Añadir \lang="es"\ al \<html>\
- [ ] Usar headings en orden jerárquico (h1, h2, h3)
- [ ] Asegurar navegación por teclado funcional

## BEST PRACTICES (< 100)

### Problemas comunes:
- [ ] Usar HTTPS (Vercel lo hace automático)
- [ ] No usar \document.write()\
- [ ] Usar \el="noopener"\ en enlaces externos
- [ ] No incluir librerías deprecated
- [ ] Usar \passive\ event listeners

## SEO (< 100)

### Problemas comunes:
- [ ] Añadir \<title>\ único por página
- [ ] Añadir \<meta name="description">\
- [ ] Usar URLs descriptivas (no IDs)
- [ ] Añadir Open Graph tags
- [ ] Generar sitemap.xml
- [ ] Añadir robots.txt
- [ ] Usar \hreflang\ si hay múltiples idiomas

## COMANDOS ÚTILES

### Ejecutar Lighthouse en modo móvil:
\\\powershell
lighthouse https://sighfood.vercel.app --view --preset=mobile
\\\

### Ejecutar Lighthouse en modo desktop:
\\\powershell
lighthouse https://sighfood.vercel.app --view --preset=desktop
\\\

### Analizar bundle size:
\\\powershell
npm run build
npx @next/bundle-analyzer .next
\\\

### Ver Core Web Vitals en tiempo real:
- Instala la extensión "Web Vitals" de Chrome
- O usa: https://web.dev/measure/

════════════════════════════════════════════════════════════