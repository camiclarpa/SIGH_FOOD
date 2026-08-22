// =============================================================================
// Configuración de la API de WhatsApp Business (Meta Cloud API)
// =============================================================================
//
// Se lee por petición, no al importar el módulo: en Workers las variables
// llegan por el binding `env` y `process.env` está vacío en el ámbito global.
// Es el mismo error que dejó a Gemini y DeepSeek sin credenciales durante
// semanas — una constante de módulo que valía `undefined` para siempre.

import { variableDeEntorno } from '@/lib/cloudflare';

/** Versión por defecto. Meta mantiene cada versión unos dos años. */
const VERSION_POR_DEFECTO = 'v19.0';

export interface ConfigWhatsApp {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  apiVersion: string;
  /** URL de envío ya montada, para no repetir la plantilla en cada llamada. */
  urlMensajes: string;
}

export type EstadoConfig =
  | { listo: true; config: ConfigWhatsApp }
  | { listo: false; faltan: string[]; motivo: string };

/**
 * Lee y valida la configuración.
 *
 * Devuelve qué falta en vez de lanzar: la pantalla de estado necesita poder
 * decir "falta el token" sin reventar, y una excepción aquí dejaría la bandeja
 * de entrada inaccesible por un ajuste ausente.
 */
export async function configWhatsApp(): Promise<EstadoConfig> {
  const [accessToken, phoneNumberId, businessAccountId, verifyToken, apiVersion] =
    await Promise.all([
      variableDeEntorno('WHATSAPP_ACCESS_TOKEN'),
      variableDeEntorno('WHATSAPP_PHONE_NUMBER_ID'),
      variableDeEntorno('WHATSAPP_BUSINESS_ACCOUNT_ID'),
      variableDeEntorno('WHATSAPP_VERIFY_TOKEN'),
      variableDeEntorno('META_API_VERSION'),
    ]);

  const faltan: string[] = [];
  if (!accessToken?.trim()) faltan.push('WHATSAPP_ACCESS_TOKEN');
  if (!phoneNumberId?.trim()) faltan.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!businessAccountId?.trim()) faltan.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
  if (!verifyToken?.trim()) faltan.push('WHATSAPP_VERIFY_TOKEN');
  // Ojo: esta comprobación es para ENVIAR. Dar de alta el webhook solo necesita
  // el token de verificación — ver tokenDeVerificacion().

  if (faltan.length > 0) {
    return {
      listo: false,
      faltan,
      motivo:
        `Faltan ${faltan.length} variable${faltan.length === 1 ? '' : 's'} de entorno. ` +
        'En Cloudflare se suben con `wrangler secret put <NOMBRE>`.',
    };
  }

  const version = apiVersion?.trim() || VERSION_POR_DEFECTO;

  return {
    listo: true,
    config: {
      accessToken: accessToken!.trim(),
      phoneNumberId: phoneNumberId!.trim(),
      businessAccountId: businessAccountId!.trim(),
      verifyToken: verifyToken!.trim(),
      apiVersion: version,
      urlMensajes: `https://graph.facebook.com/${version}/${phoneNumberId!.trim()}/messages`,
    },
  };
}

/**
 * Token de verificación del webhook, solo.
 *
 * Existe aparte de configWhatsApp() por el orden real de puesta en marcha: en
 * Meta se da de alta el webhook ANTES de tener el token de acceso permanente.
 * Exigir la configuración completa para verificar la suscripción bloqueaba ese
 * primer paso, que es justo cuando aún no está todo.
 */
export async function tokenDeVerificacion(): Promise<string | null> {
  const token = await variableDeEntorno('WHATSAPP_VERIFY_TOKEN');
  return token?.trim() || null;
}

// -----------------------------------------------------------------------------
// Normalización de teléfonos
// -----------------------------------------------------------------------------

/** Prefijo por defecto cuando el número viene sin él. Colombia. */
const PREFIJO_POR_DEFECTO = '57';

/**
 * Normaliza un teléfono al formato que espera Meta: E.164 SIN el '+'.
 *
 * Meta acepta el número solo con dígitos y así lo devuelve en los webhooks. Si
 * se guardara con '+' en un sitio y sin él en otro, el mismo número crearía dos
 * conversaciones distintas y los mensajes se repartirían entre ambas.
 *
 * Devuelve null si el número no es plausible, en lugar de intentar adivinar:
 * enviar a un número mal formado gasta una conversación de Meta y no llega.
 */
export function normalizarTelefono(bruto: string): string | null {
  if (!bruto) return null;

  // Fuera todo lo que no sea dígito: espacios, guiones, paréntesis, '+'.
  let n = bruto.replace(/\D/g, '');

  // 00 delante es el prefijo internacional en marcación europea y
  // latinoamericana; equivale al '+'.
  if (n.startsWith('00')) n = n.slice(2);

  // Un móvil colombiano son 10 dígitos y empieza por 3. Sin prefijo de país,
  // Meta lo rechazaría.
  if (n.length === 10 && n.startsWith('3')) n = PREFIJO_POR_DEFECTO + n;

  // E.164 permite hasta 15 dígitos. Menos de 8 no es un número real.
  if (n.length < 8 || n.length > 15) return null;

  return n;
}

/** Formato legible para la interfaz. No se usa para enviar. */
export function telefonoLegible(e164: string): string {
  if (e164.length === 12 && e164.startsWith('57')) {
    return `+57 ${e164.slice(2, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}`;
  }
  return `+${e164}`;
}
