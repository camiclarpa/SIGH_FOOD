// =============================================================================
// SIGH_FOOD - Helper para Webhooks de n8n
// Descripcion: Funciones para enviar notificaciones automaticas a n8n
// =============================================================================

export interface N8nWebhookPayload {
  event_type: string;
  timestamp: string;
  /** Cuerpo del evento; se serializa con JSON.stringify antes de enviarse. */
  data: unknown;
}

export interface N8nWebhookConfig {
  webhookUrl: string;
  timeout?: number;
  retries?: number;
}

/**
 * Enviar webhook a n8n
 * 
 * Esta funcion envia una notificacion a n8n sin bloquear la respuesta principal.
 * Usa fetch nativo (disponible en Cloudflare Workers y Node.js 18+).
 * 
 * @param config - Configuracion del webhook (URL, timeout, reintentos)
 * @param payload - Datos a enviar
 * @returns Promise<boolean> - true si fue exitoso, false si fallo
 */
export async function sendWebhookToN8n(
  config: N8nWebhookConfig,
  payload: N8nWebhookPayload
): Promise<boolean> {
  const { webhookUrl, timeout = 5000, retries = 2 } = config;
  
  // Si no hay URL configurada, no hacer nada
  if (!webhookUrl || webhookUrl.trim() === '') {
    console.log('Info: N8N_WEBHOOK_URL no configurado, omitiendo webhook');
    return false;
  }

  const maxAttempts = retries + 1;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Enviando webhook a n8n (intento ${attempt}/${maxAttempts})...`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeout),
      });

      if (response.ok) {
        console.log('OK: Webhook enviado exitosamente a n8n');
        return true;
      } else {
        console.warn(`ADVERTENCIA: n8n respondio con status ${response.status} (intento ${attempt})`);
        
        // Si es el ultimo intento, registrar el error
        if (attempt === maxAttempts) {
          console.error(`ERROR: n8n no respondio correctamente despues de ${maxAttempts} intentos`);
          return false;
        }
        
        // Esperar antes de reintentar (backoff exponencial simple)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`ERROR en intento ${attempt}:`, error instanceof Error ? error.message : error);
      
      // Si es el ultimo intento, retornar false
      if (attempt === maxAttempts) {
        return false;
      }
      
      // Esperar antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return false;
}

/**
 * Crear payload para webhook de nuevo lead B2B
 */
export function createLeadWebhookPayload(leadData: {
  account_id?: string;
  name: string;
  email: string;
  phone: string;
  zone: string;
  decision_maker_name: string;
  pipeline_stage?: string;
}): N8nWebhookPayload {
  return {
    event_type: 'new_b2b_lead',
    timestamp: new Date().toISOString(),
    data: {
      ...leadData,
      source: 'landing_page',
      action_required: 'schedule_lemon_test',
    },
  };
}

/**
 * Crear payload para webhook de momento sensorial
 */
export function createMomentWebhookPayload(momentData: {
  consumer_id?: string;
  account_id?: string;
  product_line: string;
  whatsapp?: string;
  table_number?: string;
}): N8nWebhookPayload {
  return {
    event_type: 'sensory_moment_registered',
    timestamp: new Date().toISOString(),
    data: {
      ...momentData,
      action_required: 'send_welcome_message',
    },
  };
}