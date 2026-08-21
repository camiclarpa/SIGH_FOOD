# WhatsApp Business: puesta en marcha

La pasarela está construida y probada. Lo que falta es conectarla a una cuenta
real de Meta, y eso son cinco variables que solo puedes obtener tú desde tu
Business Manager.

Mientras falten, el CRM funciona: la bandeja se ve, las campañas se guardan y el
webhook responde. Lo único que no ocurre es el envío — y el indicador de la
bandeja lo dice en rojo en lugar de fallar en silencio.

## Las cinco variables

| Variable | De dónde sale | Sin ella |
|---|---|---|
| `WHATSAPP_VERIFY_TOKEN` | La eliges tú. Cualquier cadena larga y aleatoria. | No se puede dar de alta el webhook en Meta. |
| `WHATSAPP_APP_SECRET` | Meta → tu app → Configuración → Básica → *App Secret* | El webhook acepta eventos sin comprobar la firma. Funciona, pero cualquiera que conozca la URL puede inyectar mensajes falsos en la bandeja. |
| `WHATSAPP_ACCESS_TOKEN` | Meta → WhatsApp → Configuración de la API → token permanente de un usuario del sistema | No se envía nada. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp → Configuración de la API, junto al número | No se envía nada. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta → WhatsApp → Configuración de la API (*WABA ID*) | No se envía nada. |

Usa un **token permanente de usuario del sistema**, no el token de prueba de 24
horas que Meta ofrece por defecto en la pantalla de inicio: ese caduca al día
siguiente y el síntoma es el error 190, que el CRM traduce como
«token caducado o revocado».

## La vía corta

```bash
node apps/web/scripts/configurar-whatsapp.mjs
```

Pide las cinco variables, las escribe en `.env.local` y **comprueba contra la
Graph API** que el token funciona de verdad — no que exista, que funciona: un
token caducado pasa cualquier comprobación de «¿está definida la variable?» y
falla en el primer envío.

Los tres secretos se teclean con la entrada oculta y no quedan en el historial
del terminal, que es lo que pasa al pegarlos dentro de un comando.

Para subirlos además al Worker de Cloudflare:

```bash
node apps/web/scripts/configurar-whatsapp.mjs --produccion
```

Se puede repetir cuantas veces haga falta: sustituye los valores en lugar de
duplicar líneas, y un Enter en blanco conserva el que hubiera. **Al rotar un
token, esta es la vía.**

El resto de esta página explica los pasos uno a uno, por si prefieres hacerlos
a mano o necesitas entender qué está pasando.

## Orden de los pasos

El orden importa, porque el webhook se da de alta **antes** de tener el token de
acceso. La pasarela está hecha para permitirlo: la verificación solo mira
`WHATSAPP_VERIFY_TOKEN`.

### 1. Sube el token de verificación

Elige una cadena aleatoria. Por ejemplo, generada con:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Y súbela al Worker:

```bash
npx wrangler secret put WHATSAPP_VERIFY_TOKEN --cwd apps/web
```

### 2. Da de alta el webhook en Meta

En Meta → tu app → WhatsApp → Configuración → Webhooks:

- **URL de devolución de llamada**: `https://<tu-dominio>/api/webhooks/whatsapp`
- **Token de verificación**: la misma cadena del paso 1.
- Suscríbete al campo **`messages`**. Sin esa suscripción no llega nada, aunque
  el webhook figure como verificado.

Meta llamará una vez al endpoint. Si responde el reto, queda activo.

### 3. Sube el resto

```bash
npx wrangler secret put WHATSAPP_APP_SECRET --cwd apps/web
```

```bash
npx wrangler secret put WHATSAPP_ACCESS_TOKEN --cwd apps/web
```

```bash
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID --cwd apps/web
```

```bash
npx wrangler secret put WHATSAPP_BUSINESS_ACCOUNT_ID --cwd apps/web
```

Cada comando pide el valor por teclado y no lo deja escrito en ningún archivo.

> Ninguna de estas variables va en `wrangler.jsonc`: ese archivo está en git. El
> `localConnectionString` que sí aparece allí es un marcador de posición, no una
> credencial.

### 4. Comprueba

Entra en **Bandeja**. El indicador de arriba consulta la Graph API de verdad, no
se limita a mirar que las variables existan: un token presente pero caducado
aparece como desconectado, que es lo que interesa saber.

## Desarrollo local

En `apps/web/.env.local` (ignorado por git). Para probar el webhook sin
credenciales de Meta bastan las dos primeras:

```
WHATSAPP_VERIFY_TOKEN=lo-que-quieras-en-local
WHATSAPP_APP_SECRET=lo-que-quieras-en-local
```

## Las plantillas

Fuera de la ventana de 24 horas desde el último mensaje del comensal, WhatsApp
**solo** entrega plantillas aprobadas de antemano. Es una regla de Meta, no una
limitación del CRM.

Por eso cada secuencia de WhatsApp guarda, además de su texto:

- el **nombre** de la plantilla tal como se aprobó en Meta,
- su **idioma** (si no coincide con el aprobado, Meta rechaza el envío),
- y qué variable del CRM va en cada hueco, **en orden**: Meta los numera
  (`{{1}}`, `{{2}}`…) en vez de nombrarlos.

Una secuencia de WhatsApp sin plantilla de Meta no se puede activar. Es
deliberado: antes se dejaba activar y la campaña figuraba como «activa» sin
mandar un solo mensaje.

El texto libre solo llega **dentro** de la ventana de 24 horas — es decir,
respondiendo desde la bandeja a quien acaba de escribir.
