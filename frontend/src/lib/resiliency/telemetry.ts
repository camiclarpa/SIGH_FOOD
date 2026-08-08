/**
 * lib/resiliency/telemetry.ts
 *
 * Observabilidad (Sentry/Analytics)
 * RFC-003 Sección 5.1
 *
 * Este módulo define todos los eventos de resiliencia que se instrumentan
 * en el pipeline de captura de Leads. Cada evento representa un punto
 * crítico donde el sistema degradó gracefully o requirió intervención manual.
 *
 * Objetivo: detectar degradación de red antes de que se convierta en pérdida
 * real de Leads — el equipo de ingeniería debe poder ver en un dashboard
 * que "el 8% de los envíos de formulario hoy requirieron reintentos" ANTES
 * de que los usuarios empiecen a quejarse.
 *
 * Eventos instrumentados (RFC-003 Sección 5.1):
 *   - localstorage_quota_exceeded: F4 del FMEA
 *   - recovered_after_retry: éxito tras Estrategia B
 *   - background_sync_registered: Background Sync disponible
 *   - background_sync_unsupported: F6 del FMEA
 *   - whatsapp_fallback_shown: Estrategia C activada
 *   - whatsapp_fallback_clicked: usuario tomó acción manual
 *
 * Niveles de log:
 *   - 'error': localstorage_quota_exceeded (pérdida inminente de fallback)
 *   - 'warning': todos los demás (degradación graceful, no pérdida)
 */

/**
 * SDKs de observabilidad que se inyectan en `window` desde fuera del bundle
 * (script de Sentry, snippet de Segment/analytics). Ambos son opcionales:
 * si no están cargados, la telemetría degrada a un no-op silencioso.
 */
interface VentanaConObservabilidad extends Window {
  Sentry?: {
    captureMessage(
      mensaje: string,
      contexto?: {
        level?: string;
        extra?: unknown;
        tags?: Record<string, string | undefined>;
      },
    ): void;
  };
  analytics?: {
    track(evento: string, propiedades?: Record<string, unknown>): void;
  };
}

/**
 * Tipos de evento de resiliencia — discriminated union para exhaustividad
 * en el renderizado de dashboards y en el manejo condicional de alertas.
 *
 * Los 6 tipos de evento son:
 *   1. localstorage_quota_exceeded
 *   2. recovered_after_retry
 *   3. background_sync_registered
 *   4. background_sync_unsupported
 *   5. whatsapp_fallback_shown
 *   6. whatsapp_fallback_clicked
 */
export type TipoEventoResiliencia =
  | 'localstorage_quota_exceeded'
  | 'recovered_after_retry'
  | 'background_sync_registered'
  | 'background_sync_unsupported'
  | 'whatsapp_fallback_shown'
  | 'whatsapp_fallback_clicked';

/**
 * Estructura completa de un evento de resiliencia.
 *
 * Campos:
 *   - evento: tipo de evento (ver TipoEventoResiliencia)
 *   - leadId: UUID del Lead afectado, para correlacionar con sesiones
 *   - timestampISO: momento exacto del evento (ISO 8601)
 *   - metadata: contexto adicional (intentos necesarios, establecimiento, etc.)
 */
export interface EventoResilienciaLead {
  evento: TipoEventoResiliencia;
  leadId: string;
  timestampISO: string;
  /** Contexto adicional para debugging — ej. cuántos intentos tomó, si aplica */
  metadata?: Record<string, unknown>;
}

/**
 * Mapeo de eventos a niveles de log para Sentry.
 *
 * Regla: solo localstorage_quota_exceeded es 'error' porque representa
 * la pérdida del fallback primario (Estrategia A). Todos los demás son
 * degradaciones graceful que el sistema manejó correctamente.
 */
const NIVEL_POR_EVENTO: Record<TipoEventoResiliencia, 'error' | 'warning'> = {
  localstorage_quota_exceeded: 'error',
  recovered_after_retry: 'warning',
  background_sync_registered: 'warning',
  background_sync_unsupported: 'warning',
  whatsapp_fallback_shown: 'warning',
  whatsapp_fallback_clicked: 'warning',
};

/**
 * Envía un evento de resiliencia a los sistemas de observabilidad configurados.
 *
 * Destinos:
 *   1. Sentry: como breadcrumb + evento custom, para correlacionar con
 *      sesiones de usuario reales que experimentaron degradación
 *   2. Analytics: para dashboards agregados del equipo de Producto
 *      (ej. "tasa de fallback por día", "ROI de usuarios que usaron WhatsApp")
 *
 * Nota de diseño: esta función NUNCA lanza excepciones — si Sentry o
 * Analytics fallan, no queremos que el usuario pierda su Lead por un
 * fallo de observabilidad. Los errores se loguean en consola para
 * debugging en desarrollo, pero no se propagan.
 *
 * @param evento - El evento de resiliencia a enviar
 */
export function enviarEventoAObservabilidad(evento: EventoResilienciaLead): void {
  try {
    const nivel = NIVEL_POR_EVENTO[evento.evento];

    const ventana = typeof window !== 'undefined'
      ? (window as VentanaConObservabilidad)
      : undefined;

    // 1. Envío a Sentry (si está disponible en el entorno)
    if (ventana?.Sentry) {
      ventana.Sentry.captureMessage(`[Resiliency] ${evento.evento}`, {
        level: nivel,
        extra: evento,
        tags: {
          resiliency_event: evento.evento,
          lead_id: evento.leadId,
        },
      });
    }

    // 2. Envío a Analytics (si está disponible en el entorno)
    if (ventana?.analytics) {
      ventana.analytics.track('lead_resiliency_event', {
        ...evento,
        nivel,
      });
    }

    // 3. Log en consola (solo en desarrollo, para debugging local)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`[Resiliency] ${evento.evento}`, evento);
    }
  } catch (error) {
    // Fallo silencioso — nunca romper el flujo del usuario por observabilidad
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[Resiliency] Error al enviar evento:', error);
    }
  }
}

/**
 * Helper para registrar eventos comunes con menos boilerplate.
 *
 * @param evento - Tipo de evento
 * @param leadId - UUID del Lead
 * @param metadata - Metadatos opcionales
 */
export function registrarEvento(
  evento: TipoEventoResiliencia,
  leadId: string,
  metadata?: Record<string, unknown>
): void {
  enviarEventoAObservabilidad({
    evento,
    leadId,
    timestampISO: new Date().toISOString(),
    metadata,
  });
}

/**
 * Calcula la tasa de fallback en una ventana de tiempo.
 *
 * Útil para el panel de alertas (Sección 5.2) — si la tasa supera el 5%
 * en 1 hora, se dispara la alerta de severidad Alta.
 *
 * @param eventosTotal - Total de envíos de formulario en la ventana
 * @param eventosFallback - Cuántos terminaron en fallback-required
 * @returns Tasa de fallback como porcentaje (0-100)
 */
export function calcularTasaFallback(
  eventosTotal: number,
  eventosFallback: number
): number {
  if (eventosTotal === 0) return 0;
  return (eventosFallback / eventosTotal) * 100;
}

/**
 * Evalúa si se debe disparar una alerta basada en la tasa de fallback.
 *
 * Umbrales (RFC-003 Sección 5.2):
 *   - Alta: > 5% en 1 hora
 *   - Media: > 3 eventos QuotaExceeded del mismo dispositivo en 1 día
 *   - Baja: > 30% de usuarios sin soporte de Background Sync
 *
 * @param tasa - Tasa de fallback actual (%)
 * @param ventanaHoras - Ventana de tiempo en horas
 * @returns true si se debe disparar alerta de severidad Alta
 */
export function debeDispararAlertaAlta(
  tasa: number,
  ventanaHoras: number = 1
): boolean {
  return tasa > 5 && ventanaHoras <= 1;
}