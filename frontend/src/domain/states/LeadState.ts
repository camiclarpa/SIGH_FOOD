/**
 * ============================================================================
 * LEAD STATE - Estados del Lead en el Pipeline
 * RFC-001: System Architecture & Topology (Sección 4.1)
 * ============================================================================
 * 
 * FUNCIÓN: Definir los estados posibles de un Lead a través del pipeline
 * de captura, desde el formulario hasta el CRM.
 * 
 * REFERENCIA RFC-001:
 *   Sección 4.1: "Estados del Lead a Través del Pipeline"
 *   [Recibido] → [Encolado] → [Procesando] → [Sincronizado] ✓
 *                                        │
 *                                        └──▶ [Fallido] → [DLQ] → [Resuelto]
 * 
 * GARANTÍAS:
 *   - Cada Lead tiene exactamente un estado en cualquier momento
 *   - Las transiciones son unidireccionales (no hay retrocesos)
 *   - El estado "Sincronizado" es terminal (éxito)
 *   - El estado "DLQ" requiere intervención manual
 * ============================================================================
 */

export enum LeadState {
  /** El formulario fue validado y aceptado por la Edge Function */
  RECIBIDO = 'RECIBIDO',
  
  /** El evento está en lead-events-log, esperando ser consumido */
  ENCOLADO = 'ENCOLADO',
  
  /** El Worker está intentando sincronizar con el CRM */
  PROCESANDO = 'PROCESANDO',
  
  /** El Webhook al CRM tuvo éxito — el Lead existe en HubSpot/Pipedrive */
  SINCRONIZADO = 'SINCRONIZADO',
  
  /** El Worker falló tras 3 reintentos */
  FALLIDO = 'FALLIDO',
  
  /** El evento fue movido a Dead Letter Queue */
  DLQ = 'DLQ',
  
  /** Un ingeniero resolvió manualmente el evento de la DLQ */
  RESUELTO_MANUALMENTE = 'RESUELTO_MANUALMENTE',
}

export interface StateTransition {
  from: LeadState;
  to: LeadState;
  reason: string;
  timestamp: number;
}

export const VALID_TRANSITIONS: Record<LeadState, LeadState[]> = {
  [LeadState.RECIBIDO]: [LeadState.ENCOLADO],
  [LeadState.ENCOLADO]: [LeadState.PROCESANDO],
  [LeadState.PROCESANDO]: [LeadState.SINCRONIZADO, LeadState.FALLIDO],
  [LeadState.FALLIDO]: [LeadState.DLQ],
  [LeadState.DLQ]: [LeadState.RESUELTO_MANUALMENTE],
  [LeadState.SINCRONIZADO]: [], // Estado terminal
  [LeadState.RESUELTO_MANUALMENTE]: [], // Estado terminal
};

export function isValidTransition(from: LeadState, to: LeadState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}