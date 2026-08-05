# ╔════════════════════════════════════════════════════════════╗
# ║  CHECKLIST: CONFIGURACIÓN MANUAL - FASE 5                  ║
# ║  Sigue estos pasos ANTES de hacer el deploy                ║
# ╚════════════════════════════════════════════════════════════╝

## PASO 1: Crear Cuenta en Vercel
- [ ] Ve a https://vercel.com y crea una cuenta (puedes usar GitHub)
- [ ] Elige el plan Hobby (gratis) o Pro (\/mes)
- [ ] Instala Vercel CLI globalmente: npm i -g vercel

## PASO 2: Configurar Upstash Redis
- [ ] Ve a https://console.upstash.com
- [ ] Crea una base de datos Redis
- [ ] Selecciona región: us-east-1 (recomendado para LATAM/USA)
- [ ] Copia UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN
- [ ] Pega las credenciales en .env.production

## PASO 3: Configurar Pipedrive (Producción)
- [ ] Ve a https://app.pipedrive.com/settings/api
- [ ] Genera un nuevo API Token
- [ ] Copia el token y pégalo en PIPEDRIVE_API_TOKEN
- [ ] Verifica los Stage IDs de tu pipeline (1, 2, 3, 4, 5, 6)

## PASO 4: Configurar Resend (Email)
- [ ] Ve a https://resend.com/api-keys
- [ ] Crea una nueva API Key
- [ ] Verifica tu dominio (opcional pero recomendado)
- [ ] Copia RESEND_API_KEY y pégalo en .env.production
- [ ] Configura SALES_TEAM_EMAIL con el email real del equipo

## PASO 5: Configurar Twilio (WhatsApp) - OPCIONAL
- [ ] Ve a https://console.twilio.com
- [ ] Activa WhatsApp Sandbox
- [ ] Copia Account SID y Auth Token
- [ ] Configura SALES_TEAM_WHATSAPP con el número del equipo

## PASO 6: Generar Tokens de Seguridad
- [ ] Ejecuta en PowerShell: [System.Guid]::NewGuid().ToString('N')
- [ ] Copia el resultado y pégalo en ADMIN_TOKEN
- [ ] Ejecuta de nuevo y pega el resultado en CRON_SECRET

## PASO 7: Configurar Dominio Personalizado (Opcional)
- [ ] Compra un dominio (ej: namecheap.com, godaddy.com)
- [ ] En Vercel: Settings → Domains → Add
- [ ] Configura los DNS records según las instrucciones de Vercel
- [ ] Espera la propagación (puede tardar hasta 48h)

## PASO 8: Subir Variables a Vercel
- [ ] Ejecuta: vercel link (vincula el proyecto)
- [ ] Ejecuta: vercel env pull .env.production.local
- [ ] O sube las variables manualmente en Vercel Dashboard:
      Project → Settings → Environment Variables
- [ ] Añade TODAS las variables de .env.production
- [ ] Asegúrate de marcarlas como "Production"

## PASO 9: Verificar .gitignore
- [ ] Asegúrate de que .env.production NO esté en Git
- [ ] Asegúrate de que ADMIN_TOKEN_BACKUP.txt NO esté en Git
- [ ] Commit y push de los cambios (excluyendo .env)

## PASO 10: Despliegue Inicial
- [ ] Ejecuta: vercel --prod
- [ ] Verifica que el deploy sea exitoso
- [ ] Abre la URL de producción y prueba los endpoints

════════════════════════════════════════════════════════════
Una vez completados todos los pasos, ejecuta:
  .\scripts\19-Verify-Production-Setup.ps1
════════════════════════════════════════════════════════════