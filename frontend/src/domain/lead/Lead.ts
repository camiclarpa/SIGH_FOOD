/**
 * ============================================================================
 * LEAD - Entidad de Dominio Completa
 * RFC-001: System Architecture & Topology (Sección 4)
 * RFC-Clean-Architecture: Capítulo 22 (Entities)
 * ============================================================================
 * 
 * FUNCIÓN: Definir la estructura completa de un Lead con todos sus campos,
 * incluyendo metadatos de estado y trazabilidad.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.3: "Cola de mensajes (Upstash Redis) — Recibe el evento del
 *   Lead vía LPUSH, con idempotencyKey para deduplicación"
 * 
 * REFERENCIA RFC-DDIA:
 *   Sección 2.1: Modelo documental del Lead (schema-on-read)
 * 
 * CAMPOS:
 *   - Datos del formulario (establecimiento, whatsapp, etc.)
 *   - Metadatos de estado (estado actual, historial de transiciones)
 *   - Trazabilidad (idempotencyKey, timestamps)
 * ============================================================================
 */

import { LeadState, StateTransition } from '../states/LeadState';

export interface TomadorDecision {
  readonly nombre: string;
  readonly rol: 'Dueño' | 'Gerente A&B' | 'Head Bartender';
}

export interface Lead {
  // Datos del formulario
  readonly establecimiento: string;
  readonly tomadorDecision: TomadorDecision;
  readonly whatsapp: string;
  readonly licoresDominantes: readonly string[];
  readonly ciudad?: string;
  
  // Metadatos de estado
  readonly estado: LeadState;
  readonly historialTransiciones: readonly StateTransition[];
  
  // Trazabilidad
  readonly idempotencyKey: string;
  readonly fechaCreacion: number;
  readonly fechaUltimaActualizacion: number;
  
  // Metadatos de sincronización
  readonly crmRecordId?: string;
  readonly intentosSincronizacion: number;
  readonly errorMensaje?: string;
}

export interface LeadCreateInput {
  readonly establecimiento: string;
  readonly tomadorDecision: TomadorDecision;
  readonly whatsapp: string;
  readonly licoresDominantes: readonly string[];
  readonly ciudad?: string;
  readonly idempotencyKey: string;
}

export function crearLead(input: LeadCreateInput): Lead {
  const now = Date.now();
  return {
    ...input,
    estado: LeadState.RECIBIDO,
    historialTransiciones: [],
    fechaCreacion: now,
    fechaUltimaActualizacion: now,
    intentosSincronizacion: 0,
  };
}

export function actualizarEstado(
  lead: Lead,
  nuevoEstado: LeadState,
  razon: string
): Lead {
  const transicion: StateTransition = {
    from: lead.estado,
    to: nuevoEstado,
    reason: razon,
    timestamp: Date.now(),
  };

  return {
    ...lead,
    estado: nuevoEstado,
    historialTransiciones: [...lead.historialTransiciones, transicion],
    fechaUltimaActualizacion: Date.now(),
  };
}