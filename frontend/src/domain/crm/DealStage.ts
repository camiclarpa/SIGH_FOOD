/**
 * domain/crm/DealStage.ts
 *
 * Etapa del Lead dentro del pipeline comercial del CRM. Mapea directamente
 * a las etapas ya definidas en la Guía de Calificación Comercial y el
 * Playbook de Negociación de SIGH_FOOD.
 */
export enum DealStage {
  LEAD_NUEVO = 'LEAD_NUEVO',
  MQL = 'MQL',
  SQL = 'SQL',
  DEMO_AGENDADA = 'DEMO_AGENDADA',
  PILOTO_ACTIVO = 'PILOTO_ACTIVO',
  CLIENTE_ACTIVO = 'CLIENTE_ACTIVO',
  DESCALIFICADO = 'DESCALIFICADO',
}