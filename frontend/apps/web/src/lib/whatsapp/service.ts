// =============================================================================
// Servicio de envío por WhatsApp Business (Meta Cloud API)
// =============================================================================
//
// Capa aislada: no sabe nada del CRM ni de sus tablas. Habla con Meta y
// devuelve un resultado tipado. Quien llama decide qué guardar.
//
// Dos reglas de Meta que condicionan todo el diseño:
//
//   1. Ventana de 24 h. Solo se puede mandar TEXTO LIBRE si el usuario escribió
//      en las últimas 24 horas. Fuera de esa ventana hay que usar una plantilla
//      aprobada. Enviar texto fuera de plazo no es un fallo cualquiera: es la
//      vía rápida a que Meta limite el número.
//
//   2. Los errores de Meta llegan con HTTP 200 en algunos casos y con códigos
//      propios dentro del cuerpo. Fiarse solo del código HTTP deja pasar
//      errores como si fueran envíos correctos.

import { configWhatsApp, normalizarTelefono } from './config';

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

/** Componente de una plantilla HSM: cabecera, cuerpo o botones. */
export interface ComponentePlantilla {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters: Array<
    | { type: 'text'; text: string }
    | { type: 'currency'; currency: { fallback_value: string; code: string; amount_1000: number } }
    | { type: 'date_time'; date_time: { fallback_value: string } }
    | { type: 'image'; image: { link: string } }
  >;
}

export type ResultadoEnvio =
  | { ok: true; wamid: string; telefono: string }
  | { ok: false; codigo: string; mensaje: string; reintentable: boolean; telefono: string | null };

/**
 * Errores de Meta que conviene distinguir.
 *
 * `reintentable` decide si tiene sentido volver a intentarlo: un token caducado
 * no se arregla reintentando, un límite de tasa sí.
 */
const ERRORES: Record<string, { mensaje: string; reintentable: boolean }> = {
  '190': { mensaje: 'El token de acceso caducó o fue revocado. Genera uno nuevo en Meta.', reintentable: false },
  '100': { mensaje: 'Parámetro inválido en la petición.', reintentable: false },
  '131026': { mensaje: 'Ese número no tiene WhatsApp o no puede recibir mensajes.', reintentable: false },
  '131047': {
    mensaje:
      'Fuera de la ventana de 24 h: solo se puede escribir texto libre si el usuario ' +
      'contactó en las últimas 24 horas. Usa una plantilla aprobada.',
    reintentable: false,
  },
  '131051': { mensaje: 'Tipo de mensaje no soportado.', reintentable: false },
  '132000': { mensaje: 'El número de parámetros no coincide con el de la plantilla.', reintentable: false },
  '132001': { mensaje: 'Esa plantilla no existe o no está aprobada en este idioma.', reintentable: false },
  '132015': { mensaje: 'La plantilla está pausada por baja calidad.', reintentable: false },
  '132016': { mensaje: 'La plantilla fue deshabilitada por Meta.', reintentable: false },
  '133010': { mensaje: 'El número de teléfono no está registrado en la cuenta.', reintentable: false },
  '4': { mensaje: 'Límite de peticiones alcanzado. Espera antes de reintentar.', reintentable: true },
  '80007': { mensaje: 'Límite de tasa de la cuenta alcanzado.', reintentable: true },
  '131056': { mensaje: 'Demasiados mensajes a ese número en poco tiempo.', reintentable: true },
  '368': { mensaje: 'La cuenta está temporalmente bloqueada por incumplir políticas.', reintentable: false },
  '1': { mensaje: 'Error interno de Meta.', reintentable: true },
  '2': { mensaje: 'Servicio de Meta temporalmente no disponible.', reintentable: true },
};

function interpretarError(codigo: unknown, mensajeMeta: unknown, detalle: unknown) {
  const cod = String(codigo ?? 'desconocido');
  const conocido = ERRORES[cod];

  if (conocido) return { codigo: cod, ...conocido };

  // Un código no catalogado se marca como no reintentable: repetir una llamada
  // cuyo fallo no se entiende puede empeorar las cosas con Meta.
  return {
    codigo: cod,
    mensaje: String(detalle ?? mensajeMeta ?? 'Error desconocido de Meta'),
    reintentable: false,
  };
}

// -----------------------------------------------------------------------------
// Llamada base
// -----------------------------------------------------------------------------

/** Tope de espera. Un envío colgado bloquearía la petición del CRM entera. */
const TIEMPO_LIMITE_MS = 15_000;

async function enviarAMeta(cuerpo: Record<string, unknown>, telefono: string): Promise<ResultadoEnvio> {
  const estado = await configWhatsApp();

  if (!estado.listo) {
    return {
      ok: false,
      codigo: 'sin_configurar',
      mensaje: estado.motivo,
      reintentable: false,
      telefono,
    };
  }

  const { config } = estado;

  let respuesta: Response;
  try {
    respuesta = await fetch(config.urlMensajes, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (e) {
    // Fallo de red o tiempo agotado: sí merece reintento.
    return {
      ok: false,
      codigo: 'red',
      mensaje: e instanceof Error ? e.message : 'No se pudo contactar con Meta',
      reintentable: true,
      telefono,
    };
  }

  let datos: Record<string, unknown>;
  try {
    datos = (await respuesta.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      codigo: String(respuesta.status),
      mensaje: 'Meta devolvió una respuesta que no es JSON',
      reintentable: respuesta.status >= 500,
      telefono,
    };
  }

  // El error puede venir con 200: se comprueba el cuerpo, no solo el estado.
  const error = datos.error as Record<string, unknown> | undefined;
  if (error || !respuesta.ok) {
    const detalle = (error?.error_data as Record<string, unknown> | undefined)?.details;
    const { codigo, mensaje, reintentable } = interpretarError(error?.code, error?.message, detalle);
    return { ok: false, codigo, mensaje, reintentable, telefono };
  }

  const mensajes = datos.messages as Array<{ id?: string }> | undefined;
  const wamid = mensajes?.[0]?.id;

  if (!wamid) {
    // Sin wamid no hay forma de seguir el estado del mensaje después.
    return {
      ok: false,
      codigo: 'sin_wamid',
      mensaje: 'Meta aceptó el envío pero no devolvió identificador de mensaje',
      reintentable: false,
      telefono,
    };
  }

  return { ok: true, wamid, telefono };
}

// -----------------------------------------------------------------------------
// Envíos
// -----------------------------------------------------------------------------

/**
 * Envía una plantilla aprobada (HSM).
 *
 * Es la única forma admitida de iniciar una conversación o de escribir fuera de
 * la ventana de 24 h. La plantilla debe existir y estar aprobada en Meta con
 * ese nombre y ese idioma exactos.
 */
export async function sendTemplateMessage(datos: {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: ComponentePlantilla[];
}): Promise<ResultadoEnvio> {
  const telefono = normalizarTelefono(datos.to);

  if (!telefono) {
    // Se corta antes de llamar: un número mal formado gasta cuota y no llega.
    return {
      ok: false,
      codigo: 'telefono_invalido',
      mensaje: `"${datos.to}" no es un número de teléfono válido`,
      reintentable: false,
      telefono: null,
    };
  }

  if (!datos.templateName?.trim()) {
    return {
      ok: false,
      codigo: 'plantilla_vacia',
      mensaje: 'Falta el nombre de la plantilla',
      reintentable: false,
      telefono,
    };
  }

  return enviarAMeta(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefono,
      type: 'template',
      template: {
        name: datos.templateName.trim(),
        // Meta exige el idioma; 'es' a secas falla si la plantilla se aprobó
        // como 'es_ES' o 'es_MX'.
        language: { code: datos.languageCode?.trim() || 'es' },
        ...(datos.components?.length ? { components: datos.components } : {}),
      },
    },
    telefono
  );
}

/**
 * Envía texto libre.
 *
 * SOLO válido dentro de la ventana de 24 h desde el último mensaje del usuario.
 * Quien llama debe comprobarlo antes; si no, Meta responde 131047 y ese error
 * repetido deteriora la calidad del número.
 */
export async function sendTextMessage(datos: {
  to: string;
  text: string;
  /** Desactiva la vista previa de enlaces. Por defecto va activada. */
  previewUrl?: boolean;
}): Promise<ResultadoEnvio> {
  const telefono = normalizarTelefono(datos.to);

  if (!telefono) {
    return {
      ok: false,
      codigo: 'telefono_invalido',
      mensaje: `"${datos.to}" no es un número de teléfono válido`,
      reintentable: false,
      telefono: null,
    };
  }

  const texto = datos.text?.trim();
  if (!texto) {
    return {
      ok: false,
      codigo: 'texto_vacio',
      mensaje: 'El mensaje no puede estar vacío',
      reintentable: false,
      telefono,
    };
  }

  // Límite duro de Meta. Cortar aquí da un error claro en vez de un 100 opaco.
  if (texto.length > 4096) {
    return {
      ok: false,
      codigo: 'texto_largo',
      mensaje: `El mensaje tiene ${texto.length} caracteres; el máximo es 4096`,
      reintentable: false,
      telefono,
    };
  }

  return enviarAMeta(
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefono,
      type: 'text',
      text: { preview_url: datos.previewUrl ?? true, body: texto },
    },
    telefono
  );
}

/**
 * Marca un mensaje entrante como leído.
 *
 * Es cortesía con el comensal —ve la doble marca azul— y le dice a Meta que la
 * conversación está atendida.
 */
export async function marcarLeidoEnMeta(wamid: string): Promise<boolean> {
  const estado = await configWhatsApp();
  if (!estado.listo) return false;

  try {
    const r = await fetch(estado.config.urlMensajes, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${estado.config.accessToken}`,
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: wamid }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    return r.ok;
  } catch {
    // No es crítico: si falla, el comensal no ve la marca azul y nada más.
    return false;
  }
}

/**
 * Comprueba que las credenciales funcionan de verdad.
 *
 * Consulta el número en la Graph API en lugar de limitarse a mirar que las
 * variables existan: un token presente pero caducado pasaría esa comprobación y
 * fallaría en el primer envío real.
 */
export async function verificarConexion(): Promise<
  | { ok: true; numero: string; nombre: string; calidad: string | null }
  | { ok: false; motivo: string }
> {
  const estado = await configWhatsApp();
  if (!estado.listo) return { ok: false, motivo: estado.motivo };

  const { config } = estado;
  const url =
    `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}` +
    '?fields=display_phone_number,verified_name,quality_rating';

  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    const d = (await r.json()) as Record<string, unknown>;

    if (!r.ok || d.error) {
      const error = d.error as Record<string, unknown> | undefined;
      const { mensaje } = interpretarError(error?.code, error?.message, undefined);
      return { ok: false, motivo: mensaje };
    }

    return {
      ok: true,
      numero: String(d.display_phone_number ?? '—'),
      nombre: String(d.verified_name ?? '—'),
      // La calidad la fija Meta y es lo que precede a una limitación del número.
      calidad: d.quality_rating ? String(d.quality_rating) : null,
    };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'No se pudo contactar con Meta' };
  }
}
