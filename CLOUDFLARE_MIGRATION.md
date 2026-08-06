# Guía de Migración: Vercel → Cloudflare Pages

## ¿Por qué migrar?
- **Costo**: \ USD ilimitado vs riesgo de cobro en Vercel
- **Ancho de banda**: Ilimitado vs 100 GB/mes en Vercel
- **Rendimiento**: Edge en 300+ ciudades mundialmente
- **Sin sorpresas**: Cloudflare limita si te pasas, NO te cobra

## Pasos para Migrar

### 1. Crear cuenta en Cloudflare (Gratis)
1. Ve a https://dash.cloudflare.com/sign-up
2. Regístrate con tu email
3. No requiere tarjeta de crédito

### 2. Conectar tu repositorio GitHub
1. Ve a https://dash.cloudflare.com/?to=/:account/pages
2. Click en ""Create a project""
3. Selecciona ""Connect to Git""
4. Autoriza Cloudflare a acceder a tu repositorio
5. Selecciona el repositorio: **camiclarpa/SIGH_FOOD**

### 3. Configurar Build Settings
- **Framework preset**: Next.js
- **Build command**: \
pm run build\
- **Build output directory**: \.next\
- **Root directory**: \rontend\ (si tu proyecto está en esa carpeta)

### 4. Configurar Variables de Entorno
Ve a **Settings > Environment Variables** y agrega:

| Variable | Valor |
|----------|-------|
| DATABASE_URL | Tu URL de Supabase/Neon |
| UPSTASH_REDIS_REST_URL | URL de Upstash Redis |
| UPSTASH_REDIS_REST_TOKEN | Token de Upstash |
| RESEND_API_KEY | Tu API key de Resend |
| DISCORD_WEBHOOK_URL | Webhook de Discord |

### 5. Desplegar
1. Click en ""Save and Deploy""
2. Cloudflare construirá automáticamente
3. Tu URL será: **sigh-food.pages.dev** (o custom domain)

### 6. Configurar Dominio Personalizado (Opcional)
1. Ve a **Custom Domains**
2. Click en ""Set up a custom domain""
3. Sigue las instrucciones para conectar tu dominio

## Ventajas de Cloudflare Pages

### Ancho de Banda Ilimitado
- No importa si tienes 10,000 o 100,000 visitas
- Tu costo sigue siendo **\ USD**

### Edge Functions
- 100,000 peticiones/día gratis
- Ejecución en el edge (latencia ultra baja)

### Integración con GitHub
- Deploy automático en cada push a main
- Preview deployments en cada PR

## Stack Completo Gratuito

| Servicio | Uso | Límite Gratis |
|----------|-----|---------------|
| **Cloudflare Pages** | Hosting | Ilimitado |
| **Supabase** | PostgreSQL | 500 MB |
| **Upstash Redis** | Cache/Rate Limiting | 10,000 req/día |
| **Resend** | Emails | 3,000/mes |
| **Discord** | Alertas | Ilimitado |

## Comandos Útiles

### Instalación de Wrangler (CLI de Cloudflare)
\\\ash
npm install -g wrangler
wrangler login
\\\

### Deploy manual (opcional)
\\\ash
npm run build
wrangler pages deploy .next --project-name sigh-food
\\\

## Soporte y Recursos
- [Documentación Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Next.js en Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**Nota**: Una vez migrado, puedes eliminar la integración con Vercel sin problemas.