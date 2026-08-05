/**
 * components/resiliency/FallbackWhatsAppButton.tsx
 *
 * Botón de WhatsApp con datos pre-llenados
 * RFC-003 Sección 3.3 y Sección 4.3 (Renderizado Condicional)
 *
 * Este componente solo se renderiza cuando el estado del formulario es
 * 'fallback-required' — es decir, cuando las Estrategias A y B se agotaron.
 *
 * Principio de UX aplicado (RFC-003 Sección 3.3):
 *   Este banner solo se muestra después de que las Estrategias A y B se
 *   agotaron — nunca se presenta como la opción primaria, para no sugerir
 *   al usuario que el formulario web "no funciona".
 *
 * Se enmarca explícitamente como "ya guardamos su información" (cierto —
 * está en LocalStorage/IndexedDB) para reducir la ansiedad de que el dato
 * se haya perdido, incluso en el escenario donde el envío automático
 * todavía no se completó.
 *
 * Accesibilidad:
 *   - role="alert" para que los lectores de pantalla anuncien el fallback
 *   - aria-live="polite" para no interrumpir al usuario
 *   - target="_blank" con rel="noopener noreferrer" por seguridad
 *   - Texto del botón claro y orientado a la acción
 */
'use client';

import { useCallback } from 'react';
import type { B2BLeadFormPayloadInferred } from '../../domain/leads/B2BLeadFormPayload';
import { construirEnlaceWhatsAppFallback } from '../../lib/resiliency/whatsappFallback';
import { enviarEventoAObservabilidad } from '../../lib/resiliency/telemetry';

interface FallbackWhatsAppButtonProps {
  /** Payload completo del formulario — se usa para construir el enlace */
  payload: B2BLeadFormPayloadInferred;
  /** leadId para correlacionar el evento de fallback con el Lead original */
  leadId: string;
}

export default function FallbackWhatsAppButton({
  payload,
  leadId,
}: FallbackWhatsAppButtonProps) {
  const enlace = construirEnlaceWhatsAppFallback(payload);

  // Registrar evento cuando el usuario hace clic en el botón
  const handleClick = useCallback(() => {
    enviarEventoAObservabilidad({
      evento: 'whatsapp_fallback_clicked',
      leadId,
      timestampISO: new Date().toISOString(),
      metadata: {
        establecimiento: payload.establecimiento,
        rol: payload.rol,
      },
    });
  }, [leadId, payload.establecimiento, payload.rol]);

  // Registrar evento cuando se muestra el fallback (efecto de montaje)
  // En un componente real se usaría useEffect, pero para simplicidad
  // lo registramos en el render (idempotente gracias al leadId)
  if (typeof window !== 'undefined') {
    // Solo registrar una vez por leadId
    const key = `whatsapp_fallback_shown_${leadId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      enviarEventoAObservabilidad({
        evento: 'whatsapp_fallback_shown',
        leadId,
        timestampISO: new Date().toISOString(),
        metadata: {
          establecimiento: payload.establecimiento,
        },
      });
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fallback-banner bg-amber-50 border-2 border-amber-400 rounded-lg p-6 my-4"
    >
      {/* Icono de advertencia */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Contenido del mensaje */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            No pudimos confirmar el envío automático
          </h3>

          <p className="text-amber-800 mb-4 leading-relaxed">
            Pero ya guardamos su información. Toque el botón para enviarla
            por WhatsApp y no perder su lugar en la agenda:
          </p>

          {/* Resumen de los datos que se enviarán */}
          <div className="bg-white/50 rounded-lg p-3 mb-4 text-sm text-amber-900">
            <div className="font-medium mb-1">Datos a enviar:</div>
            <ul className="space-y-1 text-amber-800">
              <li>• Establecimiento: {payload.establecimiento}</li>
              <li>• Contacto: {payload.nombreTomadorDecision}</li>
              <li>• ROI estimado: ${payload.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP.toLocaleString('es-CO')} COP/mes</li>
            </ul>
          </div>

          {/* Botón de WhatsApp */}
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            aria-label="Enviar datos por WhatsApp"
          >
            {/* Icono de WhatsApp */}
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Enviar mis datos por WhatsApp
          </a>

          {/* Nota de tranquilidad */}
          <p className="text-xs text-amber-700 mt-3">
            Al hacer clic, se abrirá WhatsApp con sus datos ya completados.
            Solo necesita presionar "Enviar".
          </p>
        </div>
      </div>
    </div>
  );
}