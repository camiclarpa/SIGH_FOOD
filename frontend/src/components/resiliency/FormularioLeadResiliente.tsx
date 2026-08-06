/**
 * components/resiliency/FormularioLeadResiliente.tsx
 *
 * Orquestador completo (compone las 3 estrategias)
 * RFC-003 Sección 4.2
 *
 * Este componente es el punto de entrada principal para el formulario de
 * captura de Leads con resiliencia. Compone las 3 estrategias de fallback
 * (LocalStorage, Reintentos + Background Sync, WhatsApp) en un flujo
 * coherente que garantiza cero pérdida de datos.
 *
 * Flujo de envío:
 *   1. Intento primario → POST a /api/v1/leads/phygital-demo-request
 *   2. Si falla → Estrategia A: guardar en LocalStorage
 *   3. Si LocalStorage falla (QuotaExceededError) → Estrategia C (WhatsApp)
 *   4. Si LocalStorage tiene éxito → Estrategia B: reintentos con backoff
 *   5. Si reintentos fallan → Background Sync (si disponible)
 *   6. Si Background Sync no está disponible → Estrategia C (WhatsApp)
 *
 * Principio de UX aplicado (RFC-003 Sección 4.3):
 *   El estado 'degraded-success' es indistinguible del 'success' normal
 *   para el usuario — la diferencia solo importa para observabilidad
 *   del equipo de ingeniería.
 *
 * FMEA cubierto:
 *   - F1 (Timeout de API): reintentos automáticos
 *   - F3 (Pérdida total de conexión): persistencia en LocalStorage
 *   - F4 (QuotaExceededError): salto directo a WhatsApp
 *   - F5 (Cierre de pestaña): Background Sync
 *   - F6 (Navegador sin soporte): detección explícita + fallback a WhatsApp
 */
'use client';

import { useState, useCallback } from 'react';
import {
  guardarLeadPendiente,
  type PendingLeadRecord,
} from '../../lib/resiliency/localLeadStorage';
import { reintentarConBackoff } from '../../lib/resiliency/retryQueue';
import {
  soportaBackgroundSync,
  registrarReintentoEnSegundoPlano,
} from '../../lib/resiliency/backgroundSync';
import { construirEnlaceWhatsAppFallback } from '../../lib/resiliency/whatsappFallback';
import { enviarEventoAObservabilidad, registrarEvento } from '../../lib/resiliency/telemetry';
import type { B2BLeadFormPayloadInferred } from '../../domain/leads/B2BLeadFormPayload';
import type { EstadoEnvioFormulario } from '../../lib/resiliency/formState';
import FallbackWhatsAppButton from './FallbackWhatsAppButton';
import SpinnerConMensaje from './SpinnerConMensaje';

/**
 * Hook principal que encapsula toda la lógica de envío resiliente.
 *
 * Este hook gestiona:
 *   - Estado del formulario (idle, loading, success, degraded-success, fallback-required)
 *   - Intento primario de envío
 *   - Escalamiento a estrategias de fallback
 *   - Registro de eventos de observabilidad
 *
 * @returns Objeto con estado actual y función enviar
 */
export function useEnvioResilienteDeLead() {
  const [estado, setEstado] = useState<EstadoEnvioFormulario>({ tipo: 'idle' });

  /**
   * Envía el payload del formulario con resiliencia completa.
   *
   * Flujo:
   *   1. Intento primario (camino feliz)
   *   2. Si falla → manejarFalloConFallback()
   *
   * @param payload - Payload completo del formulario B2B
   */
  const enviar = useCallback(async (payload: B2BLeadFormPayloadInferred) => {
    setEstado({ tipo: 'loading' });

    // Generar leadId único para idempotencia
    const leadId = crypto.randomUUID();

    // Intento primario — camino feliz
    try {
      const response = await fetch('/api/v1/leads/phygital-demo-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': leadId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5s timeout máximo
      });

      if (response.status === 202) {
        // Éxito — estado 'success'
        setEstado({ tipo: 'success', leadId });
        return;
      }

      // Respuesta inesperada (4xx, 5xx) — tratar como fallo
      throw new Error(`Respuesta inesperada: ${response.status}`);
    } catch (error) {
      // F1/F3 del FMEA — el intento primario falló
      // Escalar a Estrategia A (LocalStorage)
      await manejarFalloConFallback(payload, leadId, setEstado);
    }
  }, []);

  return { estado, enviar };
}

/**
 * Maneja el fallo del intento primario escalando a las estrategias de fallback.
 *
 * Flujo:
 *   1. Estrategia A: guardar en LocalStorage
 *   2. Si LocalStorage falla → Estrategia C (WhatsApp)
 *   3. Si LocalStorage tiene éxito → Estrategia B (reintentos)
 *   4. Si reintentos fallan → Background Sync (si disponible)
 *   5. Si Background Sync no está disponible → Estrategia C (WhatsApp)
 *
 * @param payload - Payload completo del formulario
 * @param leadId - UUID generado para idempotencia
 * @param setEstado - Función para actualizar el estado del formulario
 */
async function manejarFalloConFallback(
  payload: B2BLeadFormPayloadInferred,
  leadId: string,
  setEstado: (estado: EstadoEnvioFormulario) => void
) {
  // Construir registro pendiente con metadatos
  const record: PendingLeadRecord = {
    leadId,
    payload,
    intentosRealizados: 0,
    primerIntentoISO: new Date().toISOString(),
    ultimoIntentoISO: null,
  };

  // ─ ESTRATEGIA A: LocalStorage ──────────────────────────────────────────
  const guardadoLocalExitoso = guardarLeadPendiente(record);

  if (!guardadoLocalExitoso) {
    // F4 del FMEA — cuota excedida y purga fallida
    // Saltar directo a Estrategia C (WhatsApp)
    registrarEvento('localstorage_quota_exceeded', leadId, {
      establecimiento: payload.establecimiento,
    });

    setEstado({
      tipo: 'fallback-required',
      payload,
      leadId,
      enlaceWhatsApp: construirEnlaceWhatsAppFallback(payload),
    });
    return;
  }

  // ── ESTRATEGIA B: Reintentos con backoff ────────────────────────────────
  const resultado = await reintentarConBackoff(record);

  if (resultado === 'success') {
    // Éxito tras reintentos — estado 'degraded-success'
    // Para el usuario es indistinguible de 'success' normal
    registrarEvento('recovered_after_retry', leadId, {
      intentosNecesarios: 3,
    });

    setEstado({
      tipo: 'degraded-success',
      leadId,
      intentosNecesarios: 3,
    });
    return;
  }

  // ── ESTRATEGIA B.1: Background Sync ─────────────────────────────────────
  const backgroundSyncRegistrado = await registrarReintentoEnSegundoPlano(leadId);

  if (backgroundSyncRegistrado) {
    // El navegador seguirá intentando aunque el usuario cierre la pestaña
    // PERO aún así se muestra el fallback de WhatsApp de inmediato
    registrarEvento('background_sync_registered', leadId);
  } else {
    // F6 del FMEA — navegador sin soporte de Background Sync
    registrarEvento('background_sync_unsupported', leadId);
  }

  // ─ ESTRATEGIA C: WhatsApp Fallback ─────────────────────────────────────
  // Siempre se muestra el fallback de WhatsApp, independientemente de si
  // Background Sync está disponible o no. Nunca se le pide al usuario B2B
  // de alto valor que simplemente "confíe" en un proceso invisible.
  setEstado({
    tipo: 'fallback-required',
    payload,
    leadId,
    enlaceWhatsApp: construirEnlaceWhatsAppFallback(payload),
  });
}

/**
 * Componente principal del formulario resiliente.
 *
 * Renderiza condicionalmente según el estado actual:
 *   - idle: formulario normal (inputs + botón de envío)
 *   - loading: spinner con mensaje
 *   - success / degraded-success: confirmación exitosa
 *   - fallback-required: botón de WhatsApp con datos pre-llenados
 */
interface FormularioLeadResilienteProps {
  /** Componente de formulario con los inputs (establecimiento, whatsapp, etc.) */
  FormularioInputs: React.FC<{ onSubmit: (payload: B2BLeadFormPayloadInferred) => void }>;
  /** Componente de confirmación exitosa */
  ConfirmacionExitosa: React.FC<{ mensaje: string }>;
}

export default function FormularioLeadResiliente({
  FormularioInputs,
  ConfirmacionExitosa,
}: FormularioLeadResilienteProps) {
  const { estado, enviar } = useEnvioResilienteDeLead();

  // Renderizado condicional por estado
  switch (estado.tipo) {
    case 'idle':
      return <FormularioInputs onSubmit={enviar} />;

    case 'loading':
      return (
        <SpinnerConMensaje
          texto="Enviando su solicitud..."
          tiempoEsperaLarga={3000}
          textoEsperaLarga="Tardando un poco más de lo esperado... pero no se ha perdido su información."
        />
      );

    case 'success':
    case 'degraded-success':
      // Principio de UX: indistinguible para el usuario
      return (
        <ConfirmacionExitosa
          mensaje="¡Listo! Un asesor lo contactará por WhatsApp en menos de 24 horas."
        />
      );

    case 'fallback-required':
      return (
        <FallbackWhatsAppButton
          payload={estado.payload as B2BLeadFormPayloadInferred}
          leadId={estado.leadId}
        />
      );

    default:
      // Exhaustividad garantizada por TypeScript (discriminated union)
      return null;
  }
}