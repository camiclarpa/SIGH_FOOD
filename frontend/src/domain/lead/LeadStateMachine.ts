/**
 * ============================================================================
 * LEAD STATE MACHINE - Máquina de Estados del Lead
 * RFC-001: System Architecture & Topology (Sección 4.1)
 * ============================================================================
 * 
 * FUNCIÓN: Gestionar las transiciones de estado de un Lead de forma segura,
 * validando que cada transición sea permitida según el diagrama de estados.
 * 
 * REFERENCIA RFC-001:
 *   Sección 4.1: Diagrama de estados del Lead
 *   [Recibido] → [Encolado] → [Procesando] → [Sincronizado] ✓
 *                                        │
 *                                        └──▶ [Fallido] → [DLQ] → [Resuelto]
 * 
 * GARANTÍAS:
 *   - Ninguna transición inválida puede ocurrir
 *   - Cada transición queda registrada en el historial
 *   - Los estados terminales (Sincronizado, Resuelto) no permiten más transiciones
 * ============================================================================
 */

import { Lead, actualizarEstado } from './Lead';
import { LeadState, isValidTransition } from '../states/LeadState';

export class LeadStateMachine {
  /**
   * Transiciona un Lead de RECIBIDO a ENCOLADO.
   * Ocurre cuando la Edge Function hace LPUSH a la cola.
   */
  static encolar(lead: Lead): Lead {
    if (lead.estado !== LeadState.RECIBIDO) {
      throw new Error(`No se puede encolar un Lead en estado ${lead.estado}`);
    }
    return actualizarEstado(lead, LeadState.ENCOLADO, 'LPUSH a lead-events-log');
  }

  /**
   * Transiciona un Lead de ENCOLADO a PROCESANDO.
   * Ocurre cuando el Worker Consumer dequeue el evento.
   */
  static procesar(lead: Lead): Lead {
    if (lead.estado !== LeadState.ENCOLADO) {
      throw new Error(`No se puede procesar un Lead en estado ${lead.estado}`);
    }
    return actualizarEstado(lead, LeadState.PROCESANDO, 'Worker Consumer dequeue evento');
  }

  /**
   * Transiciona un Lead de PROCESANDO a SINCRONIZADO.
   * Ocurre cuando el Webhook al CRM tiene éxito.
   */
  static sincronizar(lead: Lead, crmRecordId: string): Lead {
    if (lead.estado !== LeadState.PROCESANDO) {
      throw new Error(`No se puede sincronizar un Lead en estado ${lead.estado}`);
    }
    const updated = actualizarEstado(lead, LeadState.SINCRONIZADO, `CRM record created: ${crmRecordId}`);
    return { ...updated, crmRecordId };
  }

  /**
   * Transiciona un Lead de PROCESANDO a FALLIDO.
   * Ocurre cuando el Worker Consumer falla tras 3 reintentos.
   */
  static fallar(lead: Lead, errorMensaje: string, intentos: number): Lead {
    if (lead.estado !== LeadState.PROCESANDO) {
      throw new Error(`No se puede marcar como fallido un Lead en estado ${lead.estado}`);
    }
    const updated = actualizarEstado(lead, LeadState.FALLIDO, `Falló tras ${intentos} intentos: ${errorMensaje}`);
    return { ...updated, intentosSincronizacion: intentos, errorMensaje };
  }

  /**
   * Transiciona un Lead de FALLIDO a DLQ.
   * Ocurre cuando el Worker Consumer mueve el evento a Dead Letter Queue.
   */
  static moverADLQ(lead: Lead): Lead {
    if (lead.estado !== LeadState.FALLIDO) {
      throw new Error(`No se puede mover a DLQ un Lead en estado ${lead.estado}`);
    }
    return actualizarEstado(lead, LeadState.DLQ, 'Movido a Dead Letter Queue');
  }

  /**
   * Transiciona un Lead de DLQ a RESUELTO_MANUALMENTE.
   * Ocurre cuando un ingeniero resuelve manualmente el evento.
   */
  static resolverManualmente(lead: Lead): Lead {
    if (lead.estado !== LeadState.DLQ) {
      throw new Error(`No se puede resolver manualmente un Lead en estado ${lead.estado}`);
    }
    return actualizarEstado(lead, LeadState.RESUELTO_MANUALMENTE, 'Resuelto manualmente por ingeniería');
  }

  /**
   * Verifica si un Lead está en un estado terminal.
   */
  static esEstadoTerminal(lead: Lead): boolean {
    return lead.estado === LeadState.SINCRONIZADO || 
           lead.estado === LeadState.RESUELTO_MANUALMENTE;
  }
}