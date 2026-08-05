# Panel de Alertas de Resiliencia — SIGH_FOOD
 
**RFC-003 Sección 5.2**
**Última actualización:** 2026-08-05
**Responsable:** Equipo de SRE / Arquitectura de Software
 
---
 
## Resumen
 
Este documento define las alertas que el equipo de operaciones debe monitorear para detectar degradación del pipeline de captura de Leads ANTES de que se convierta en pérdida real de datos. Cada alerta incluye:
 
- **Condición de disparo**: qué métrica y umbral activan la alerta
- **Severidad**: Alta / Media / Baja
- **Acción del equipo**: qué hacer inmediatamente después de recibir la alerta
- **Escalamiento**: a quién contactar si la acción inicial no resuelve
 
---
 
## Alerta 1: Tasa de Fallback Elevada
 
| Campo | Valor |
|-------|-------|
| **Nombre** | `resiliency_fallback_rate_high` |
| **Severidad** | Alta |
| **Condición** | Más del 5% de los envíos de formulario en 1 hora terminan en `fallback-required` |
| **Métrica** | `sum(whatsapp_fallback_shown) / sum(form_submissions) * 100` |
| **Ventana** | 1 hora deslizante |
 
### Acción Inmediata
 
1. Verificar estado de la Edge Function `/api/v1/leads/phygital-demo-request` en Vercel/Cloudflare
2. Correlacionar con incidentes activos en el CRM (HubSpot/Pipedrive status page)
3. Revisar logs de la cola Upstash Redis para detectar saturación
4. Si el CRM está caído: activar protocolo de contingencia (RFC-001 Sección 6)
 
### Escalamiento
 
- Si la tasa supera 15%: contactar al on-call de ingeniería inmediatamente
- Si persiste más de 2 horas: escalar a Director de Ingeniería
 
---
 
## Alerta 2: Cuota de LocalStorage Excedida Repetidamente
 
| Campo | Valor |
|-------|-------|
| **Nombre** | `resiliency_localstorage_quota_exceeded_repeated` |
| **Severidad** | Media |
| **Condición** | Más de 3 eventos `localstorage_quota_exceeded` del mismo dispositivo/sesión en 1 día |
| **Métrica** | `count(localstorage_quota_exceeded) grouped by device_fingerprint` |
| **Ventana** | 24 horas |
 
### Acción Inmediata
 
1. Identificar el dispositivo afectado (probablemente un dispositivo compartido de bar)
2. Verificar si hay datos de contacto disponibles vía otro canal (email, teléfono fijo)
3. Contactar manualmente al establecimiento para recuperar el Lead
4. Considerar limpiar el LocalStorage del dispositivo si es accesible
 
### Contexto
 
Esta alerta suele dispararse en dispositivos compartidos (tablets de bar, kioskos) donde múltiples Leads se acumulan sin conexión. No es un fallo del sistema — es una señal de uso en un contexto no previsto.
 
---
 
## Alerta 3: WhatsApp Fallback Mostrado pero Nunca Clickeado
 
| Campo | Valor |
|-------|-------|
| **Nombre** | `resiliency_whatsapp_fallback_no_click` |
| **Severidad** | Media |
| **Condición** | Un Lead alcanza `fallback-required` y el evento `whatsapp_fallback_clicked` no se registra dentro de 10 minutos |
| **Métrica** | `whatsapp_fallback_shown - whatsapp_fallback_clicked (con offset de 10 min)` |
| **Ventana** | 10 minutos desde el evento `shown` |
 
### Acción Inmediata
 
1. Este Lead está en riesgo real de perderse
2. El equipo comercial puede intentar contacto proactivo por otro medio si el WhatsApp ya fue capturado en un intento previo exitoso de otro campo
3. Revisar si el mensaje del fallback es claro y accionable (A/B test de copy)
 
### Escalamiento
 
- Si más del 50% de los fallbacks no son clickeados: revisar UX del banner (Sección 3.3 del RFC-003)
- Escalar a equipo de Producto para revisar el flujo de fallback
 
---
 
## Alerta 4: Background Sync No Soportado, Tasa Alta
 
| Campo | Valor |
|-------|-------|
| **Nombre** | `resiliency_background_sync_unsupported_rate` |
| **Severidad** | Baja |
| **Condición** | Más del 30% de los usuarios en `fallback-required` no tienen soporte de Background Sync |
| **Métrica** | `sum(background_sync_unsupported) / sum(fallback_required) * 100` |
| **Ventana** | 7 días (tendencia, no instantánea) |
 
### Acción Inmediata
 
1. Esta alerta NO requiere acción inmediata — es una señal de tendencia
2. Analizar la distribución de navegadores de la base de usuarios
3. Si la proporción de Safari/iOS es alta: evaluar una estrategia de fallback adicional específica para ese segmento
 
### Contexto
 
Safari/iOS tiene soporte parcial de Background Sync desde iOS 17.4 (marzo 2024). Esta alerta ayuda a decidir si vale la pena invertir en una estrategia alternativa (ej. notificaciones push) para ese segmento.
 
---
 
## Configuración Técnica
 
### Sentry
 
```typescript
// En sentry.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.tags?.resiliency_event) {
      return event;
    }
    return event;
  },
});
```
 
### Analytics (Segment/Mixpanel)
 
```typescript
// En analytics.config.ts
analytics.track('lead_resiliency_event', {
  evento: 'whatsapp_fallback_shown',
  leadId: 'abc-123',
  timestampISO: '2026-08-05T10:00:00.000Z',
  metadata: { establecimiento: 'Gastrobar X' },
});
```
 
### Dashboard Recomendado (Grafana/Datadog)
 
**Panel 1: Tasa de Fallback en Tiempo Real**
- Gráfico de línea: `fallback_rate` últimos 7 días
- Umbrales visuales: 5% (amarillo), 15% (rojo)
 
**Panel 2: Distribución de Eventos de Resiliencia**
- Gráfico de barras apiladas: conteo por tipo de evento
- Drill-down por `leadId` para investigar casos específicos
 
**Panel 3: Tasa de Éxito de WhatsApp Fallback**
- Métrica: `whatsapp_fallback_clicked / whatsapp_fallback_shown`
- Objetivo: mayor al 60% (si es menor, el copy del banner necesita mejora)
 
---
 
## Runbook de Respuesta a Incidentes
 
### Escenario: Alerta 1 disparada (Tasa > 5%)
 
1. Minuto 0-5: Verificar status de Edge Function y CRM
2. Minuto 5-15: Si CRM caído, activar modo contingencia (RFC-001)
3. Minuto 15-30: Comunicar al equipo comercial que los Leads llegarán con delay
4. Minuto 30-60: Monitorear recuperación y cerrar incidente
 
### Escenario: Alerta 3 disparada (WhatsApp no clickeado)
 
1. Minuto 0-10: Esperar ventana de 10 minutos
2. Minuto 10-20: Equipo comercial intenta contacto alternativo
3. Minuto 20-30: Loguear Lead como "recuperado manualmente" o "perdido"
 
---
 
## Revisión y Mantenimiento
 
- **Frecuencia de revisión:** Trimestral
- **Responsable:** Equipo de SRE + Producto
- **Criterio de ajuste de umbrales:** Si una alerta se dispara más de 10 veces/mes sin acción real, ajustar umbral o eliminar
 
---
 
*Documento generado como parte de la Fase 5 del RFC-003*