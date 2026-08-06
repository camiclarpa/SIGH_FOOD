# Configuración de Cloudflare Pages para SIGH_FOOD

## Configuración en el Dashboard de Cloudflare

Dado que este es un monorepo y tu aplicación Next.js está en la carpeta rontend/, debes configurar Cloudflare Pages de la siguiente manera:

1. Ve a: https://dash.cloudflare.com/?to=/:account/pages/view/sigh-food/settings/builds
2. Haz clic en "Configure" o "Edit" en **Build settings**.
3. Configura exactamente estos valores:

| Campo | Valor |
|-------|-------|
| **Framework preset** | Next.js |
| **Root directory** | rontend |
| **Build command** | 
pm run build |
| **Build output directory** | .next |
| **Deploy command** | (dejar vacío) |

## Variables de Entorno (Environment Variables)

En la misma sección de configuración, agrega:

| Variable | Valor |
|----------|-------|
| NODE_VERSION | 20 |
| NPM_VERSION | 10 |
| NEXT_TELEMETRY_DISABLED | 1 |

## Pasos para Re-desplegar

1. Guarda los cambios en el dashboard.
2. Ve a la pestaña **Deployments**.
3. Haz clic en **Retry build** o **Trigger new deployment**.
4. Espera 2-3 minutos.

## Notas Importantes

- Cloudflare Pages tiene ancho de banda ILIMITADO en el plan gratuito.
- 100 builds por mes incluidos.
- No hay riesgo de "bill shock" como en Vercel.
- El dominio será: sigh-food.pages.dev (o tu dominio personalizado).