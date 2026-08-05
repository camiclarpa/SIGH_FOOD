# ════════════════════════════════════════════════════════════╗
# ║  GUÍA DE OPTIMIZACIÓN CORE WEB VITALS - SIGH_FOOD          ║
# ║  Fase 5 - Semana 1 - Tarea 4                               ║
# ╚════════════════════════════════════════════════════════════╝

## OBJETIVOS CORE WEB VITALS

### LCP (Largest Contentful Paint) < 2.5s
- **Qué mide:** Tiempo de carga del elemento más grande visible
- **Elemento LCP en SIGH_FOOD:** Imagen hero
- **Optimizaciones aplicadas:**
  - priority: true (preload)
  - sizes optimizados
  - Formato WebP/AVIF
  - Preconnect a CDN

### FID/INP (Interaction to Next Paint) < 100ms
- **Qué mide:** Tiempo de respuesta a interacciones
- **Optimizaciones aplicadas:**
  - Código JavaScript mínimo
  - Defer de scripts no críticos
  - Web Workers para tareas pesadas

### CLS (Cumulative Layout Shift) = 0
- **Qué mide:** Cambios de layout inesperados
- **Optimizaciones aplicadas:**
  - Dimensiones explícitas en imágenes
  - Font-display: swap
  - Reservas de espacio para ads/embeds

## CÓMO VERIFICAR

### 1. Verificación Automática
\\\powershell
.\\scripts\\25-Verify-CoreWebVitals.ps1 -DeploymentUrl https://sighfood.vercel.app
\\\

### 2. Chrome DevTools (Manual)
1. Abre https://sighfood.vercel.app
2. F12 → Lighthouse
3. Selecciona: Mobile + Desktop
4. Click en 'Analyze page load'
5. Espera 2-3 minutos
6. Revisa las 4 categorías

### 3. PageSpeed Insights
Visita: https://pagespeed.web.dev/
- Ingresa: https://sighfood.vercel.app
- Obtén recomendaciones específicas

### 4. Web Vitals Extension
Instala: https://chrome.google.com/webstore/detail/web-vitals
- Mide Core Web Vitals en tiempo real
- Útil para desarrollo local

## TÉCNICAS DE OPTIMIZACIÓN APLICADAS

### Imágenes
- next/image con priority para LCP
- Formatos modernos (WebP, AVIF)
- sizes responsivos
- Lazy loading automático

### Fuentes
- next/font/google (auto-optimizado)
- display: swap
- Preload de fuentes críticas

### JavaScript
- Code splitting automático
- Tree shaking
- Minificación
- Defer de scripts no críticos

### CSS
- PurgeCSS (elimina CSS no usado)
- Minificación
- Critical CSS inline

### Cache
- Assets estáticos: 1 año
- HTML: 1 hora + stale-while-revalidate
- Service Worker (opcional)

## SOLUCIÓN DE PROBLEMAS

### LCP > 2.5s
- Verifica que la imagen hero tenga priority
- Reduce tamaño de imagen (calidad 85)
- Usa CDN (Vercel lo hace automático)
- Implementa preload

### CLS > 0.1
- Añade width/height a todas las imágenes
- Reserva espacio para ads/embeds
- Evita insertar contenido dinámico arriba

### TBT > 200ms
- Reduce JavaScript no usado
- Defer de analytics
- Usa Web Workers
- Code split de componentes pesados

════════════════════════════════════════════════════════════