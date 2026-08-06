# Configuración de Cloudflare Pages para SIGH_FOOD
 
## Problemas Detectados en el Build Actual
 
### Build command: None
**Problema**: No se está ejecutando ningún build.
**Solución**: Cambiar a `npm run build`
 
### Root directory: /
**Problema**: Apunta a la raíz del repositorio, pero el proyecto Next.js está en `frontend/`.
**Solución**: Cambiar a `frontend`
 
### Deploy command: npx wrangler deploy
**Problema**: Este comando es para Workers, no para Pages.
**Solución**: Eliminar el deploy command (Pages lo hace automáticamente).
 
## Configuración Correcta en Cloudflare Dashboard
 
### Opción A: Desde el Dashboard (Recomendado)
 
1. Ve a: https://dash.cloudflare.com/?to=/:account/pages/view/sigh-food/settings/builds
2. Haz clic en "Configure" o "Edit" en Build settings
3. Configura lo siguiente:
 
| Campo | Valor |
|-------|-------|
| **Framework preset** | Next.js |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | `frontend` |
| **Deploy command** | (dejar vacío) |
 
### Opción B: Usando wrangler.toml (Automático)
 
El archivo `wrangler.toml` ya fue creado/actualizado por este script.
Cloudflare Pages lo leerá automáticamente si está en la raíz del repositorio.
 
## Variables de Entorno Necesarias
 
En el dashboard de Cloudflare Pages, ve a:
**Settings > Environment Variables**
 
Agrega las siguientes variables:
 
| Variable | Valor |
|----------|-------|
| NODE_VERSION | 20 |
| NPM_VERSION | 10 |
| NEXT_TELEMETRY_DISABLED | 1 |
 
## Pasos para Re-desplegar
 
1. Guarda los cambios en el dashboard
2. Ve a la pestaña "Deployments"
3. Haz clic en "Retry build" o "Trigger new deployment"
4. Espera 2-3 minutos
 
## Comandos Locales para Pruebas
 
```bash
# Instalar dependencias
cd frontend
npm install
 
# Build local
npm run build
 
# Preview local
npm start
```
 
## Notas Importantes
 
- Cloudflare Pages tiene ancho de banda ILIMITADO en el plan gratuito
- 100 builds por mes incluidos
- No hay riesgo de "bill shock" como en Vercel
- El dominio será: sigh-food.pages.dev (o tu dominio personalizado)