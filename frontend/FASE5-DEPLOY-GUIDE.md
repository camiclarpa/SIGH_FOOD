# ════════════════════════════════════════════════════════════╗
# ║  GUÍA DE DESPLIEGUE EN VERCEL - SIGH_FOOD                  ║
# ║  Fase 5 - Semana 1 - Tarea 2                               ║
# ╚════════════════════════════════════════════════════════════╝

## REQUISITOS PREVIOS
- [ ] Haber completado la Tarea 1 (FASE5-CHECKLIST.md)
- [ ] Tener Node.js instalado (v18 o superior)
- [ ] Tener cuenta en Vercel (https://vercel.com)
- [ ] Tener .env.production configurado con credenciales reales

## PASO 1: Instalar Vercel CLI
\\\powershell
npm install -g vercel
\\\

## PASO 2: Iniciar Sesión en Vercel
\\\powershell
vercel login
\\\
- Elige tu método de autenticación (GitHub recomendado)
- Se abrirá el navegador automáticamente

## PASO 3: Vincular el Proyecto
\\\powershell
vercel link
\\\
- Si es la primera vez, te preguntará si quieres crear un nuevo proyecto
- Responde: **Yes**
- Nombre del proyecto: **sigh-food** (o el que prefieras)
- Directorio raíz: **./frontend** (presiona Enter)
- Framework preset: **Next.js** (presiona Enter)

## PASO 4: Subir Variables de Entorno
\\\powershell
vercel env pull .env.production.local
\\\
- Esto descargará las variables desde Vercel (si ya las configuraste)
- O súbelas manualmente:
  1. Ve a Vercel Dashboard
  2. Selecciona tu proyecto
  3. Settings → Environment Variables
  4. Añade cada variable de .env.production
  5. Marca todas como **Production**

## PASO 5: Desplegar a Producción
\\\powershell
vercel --prod
\\\
- El despliegue tomará 2-5 minutos
- Al finalizar, verás la URL de producción

## PASO 6: Verificar Endpoints
\\\powershell
.\\scripts\\20-Verify-Deploy.ps1 -DeploymentUrl https://sigh-food.vercel.app
\\\
- Reemplaza la URL con la de tu despliegue
- Verifica que todos los endpoints respondan correctamente

## PASO 7: Configurar Dominio Personalizado (Opcional)
1. Ve a Vercel Dashboard → Settings → Domains
2. Añade tu dominio (ej: sighfood.com)
3. Configura los DNS records en tu registrador:
   - Type: **A**
   - Name: **@**
   - Value: **76.76.21.21**
   - TTL: **Auto**
4. Espera la propagación (puede tardar hasta 48h)

## PASO 8: Verificar Cron Jobs
1. Ve a Vercel Dashboard → Settings → Cron Jobs
2. Verifica que estén activos:
   - /api/cron/check-dlq (cada hora)
   - /api/warmup (cada 5 minutos)

## COMANDOS ÚTILES

### Ver logs en tiempo real:
\\\powershell
vercel logs --follow
\\\

### Desplegar a Preview (rama de desarrollo):
\\\powershell
vercel
\\\

### Ver información del proyecto:
\\\powershell
vercel ls
\\\

## SOLUCIÓN DE PROBLEMAS

### Error: "No credentials found"
- Ejecuta: vercel login

### Error: "Missing env vars"
- Asegúrate de subir todas las variables en Vercel Dashboard
- O ejecuta: vercel env pull

### Error: "Build failed"
- Revisa los logs: vercel logs
- Verifica que todas las dependencias estén en package.json

### Cold Starts frecuentes
- Verifica que el endpoint /api/warmup esté siendo llamado cada 5 min
- Revisa Vercel Dashboard → Cron Jobs

════════════════════════════════════════════════════════════
Una vez completado el despliegue, ejecuta:
  .\\scripts\\20-Verify-Deploy.ps1 -DeploymentUrl TU_URL_AQUI
════════════════════════════════════════════════════════════