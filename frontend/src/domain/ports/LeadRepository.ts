/**
 * ============================================================================
 * LEAD REPOSITORY — Puerto del Dominio (Clean Architecture Cap. 11)
 * RFC-001: Capa de Integraciones Externas
 * RFC-Clean-Architecture: Principio DIP (Dependency Inversion)
 * ============================================================================
 * 
 * FUNCIÓN: Definir la abstracción que el dominio necesita para persistir
 * Leads, sin conocer los detalles de implementación (HubSpot, Pipedrive, etc.)
 * 
 * REFERENCIA RFC-CLEAN-ARCHITECTURE:
 *   Capítulo 11: DIP — Principio de Inversión de Dependencias.
 *   "Los módulos de alto nivel no deben depender de módulos de bajo nivel.
 *   Ambos deben depender de abstracciones."
 * 
 * DIRECCIÓN DE DEPENDENCIA:
 *   HubSpotLeadRepository → implementa → LeadRepository (abstracción del dominio)
 *   
 *   El dominio (AgendarDemoUseCase) NUNCA sabe que existe HubSpot.
 *   Si mañana migramos a Pipedrive, solo cambiamos este archivo.
 * 
 * REFERENCIA RFC-DDIA:
 *   Capítulo 30: "La Base de Datos Es un Detalle" — la elección del motor
 *   de persistencia es un detalle de la capa de Frameworks y Drivers.
 * ============================================================================
 */

export interface LeadData {
  readonly establecimiento: string;
  readonly whatsapp: string;
  readonly ciudad?: string;
  readonly licoresDominantes?: string[];
  readonly tomadorDecision?: {
    readonly nombre: string;
    readonly rol: 'Dueño' | 'Gerente A&B' | 'Head Bartender';
  };
  readonly idempotencyKey: string;
  readonly timestamp: number;
}

export interface LeadRepositoryResult {
  readonly success: boolean;
  readonly crmRecordId?: string;
  readonly error?: string;
}

export interface LeadRepository {
  /**
   * Persiste un Lead en el CRM externo.
   * 
   * Garantías:
   *   - Idempotente: llamar dos veces con el mismo idempotencyKey no duplica
   *   - At-least-once: el Worker Consumer reintenta si falla
   *   - Timeout: máximo 5 segundos por llamada (RFC-HPBN)
   */
  guardar(lead: LeadData): Promise<LeadRepositoryResult>;
}