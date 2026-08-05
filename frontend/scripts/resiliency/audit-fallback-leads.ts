/**
 * scripts/resiliency/audit-fallback-leads.ts
 *
 * Auditoría Manual de Leads en Fallback
 * RFC-003 Sección 5.3
 *
 * Este script se ejecuta diariamente (extensión del job batch nocturno
 * del RFC-DDIA Sección 9) para generar un reporte de Leads que pasaron
 * por fallback sin completar la captura.
 *
 * Objetivo: el equipo de Éxito del Cliente/Ventas revisa esta lista cada
 * mañana para intentar recuperar manualmente cualquier Lead que los 3
 * niveles de fallback automático no lograron capturar por completo,
 * cerrando el círculo de la garantía de "cero pérdida de datos de Leads".
 *
 * Criterios de inclusión en el reporte:
 *   1. Lead con evento 'localstorage_quota_exceeded'
 *   2. Lead con evento 'background_sync_unsupported'
 *   3. Lead con evento 'whatsapp_fallback_shown' SIN posterior
 *      'whatsapp_fallback_clicked' en ventana de 10 minutos
 *
 * Ejecución:
 *   npx tsx scripts/resiliency/audit-fallback-leads.ts --date=2026-08-05
 */
 
import type { TipoEventoResiliencia } from '../../src/lib/resiliency/telemetry';
 
interface LeadFallbackRecord {
  leadId: string;
  establecimiento: string;
  whatsapp: string;
  eventosResiliencia: TipoEventoResiliencia[];
  whatsappClickeado: boolean;
  timestampFallback: string;
  riesgoPerdida: 'alto' | 'medio' | 'bajo';
}
 
/**
 * Simula la consulta a la base de datos de eventos de resiliencia.
 *
 * En producción, esto consultaría:
 *   - Sentry Events API (para eventos de resiliencia)
 *   - Analytics API (para eventos de clic en WhatsApp)
 *   - CRM (para verificar si el Lead finalmente se sincronizó)
 */
async function obtenerLeadsEnFallback(fecha: string): Promise<LeadFallbackRecord[]> {
  // Implementación real: consultar APIs de observabilidad.
  // Por ahora, retornamos estructura vacía para validación de tipo.
  console.log(`[Audit] Consultando leads en fallback para ${fecha}...`);
  return [];
}
 
/**
 * Evalúa el riesgo de pérdida de un Lead en fallback.
 *
 * Criterios:
 *   - Alto: QuotaExceededError + WhatsApp no clickeado (sin fallback local)
 *   - Medio: Background Sync no soportado + WhatsApp no clickeado
 *   - Bajo: WhatsApp fallback mostrado pero aún dentro de ventana de 10 min
 */
function evaluarRiesgoPerdida(record: LeadFallbackRecord): 'alto' | 'medio' | 'bajo' {
  const tieneQuotaExceeded = record.eventosResiliencia.includes('localstorage_quota_exceeded');
  const tieneBackgroundSyncUnsupported = record.eventosResiliencia.includes('background_sync_unsupported');
  const whatsappClickeado = record.whatsappClickeado;
 
  if (tieneQuotaExceeded && !whatsappClickeado) {
    return 'alto';
  }
 
  if (tieneBackgroundSyncUnsupported && !whatsappClickeado) {
    return 'medio';
  }
 
  return 'bajo';
}
 
/**
 * Genera el reporte de auditoría en formato legible.
 */
function generarReporte(leads: LeadFallbackRecord[]): string {
  const lines: string[] = [];
 
  lines.push('════════════════════════════════════════════════════════════');
  lines.push(' REPORTE DIARIO DE LEADS EN FALLBACK');
  lines.push('════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total de Leads en fallback: ${leads.length}`);
  lines.push('');
 
  const altoRiesgo = leads.filter((l) => l.riesgoPerdida === 'alto');
  const medioRiesgo = leads.filter((l) => l.riesgoPerdida === 'medio');
  const bajoRiesgo = leads.filter((l) => l.riesgoPerdida === 'bajo');
 
  lines.push(`Alto riesgo: ${altoRiesgo.length}`);
  lines.push(`Medio riesgo: ${medioRiesgo.length}`);
  lines.push(`Bajo riesgo: ${bajoRiesgo.length}`);
  lines.push('');
 
  if (altoRiesgo.length > 0) {
    lines.push('────────────────────────────────────────────────────────────────');
    lines.push(' LEADS DE ALTO RIESGO (acción inmediata requerida)');
    lines.push('────────────────────────────────────────────────────────────────');
    lines.push('');
 
    altoRiesgo.forEach((lead) => {
      lines.push(`  Lead ID: ${lead.leadId}`);
      lines.push(`  Establecimiento: ${lead.establecimiento}`);
      lines.push(`  WhatsApp: ${lead.whatsapp}`);
      lines.push(`  Eventos: ${lead.eventosResiliencia.join(', ')}`);
      lines.push(`  WhatsApp clickeado: ${lead.whatsappClickeado ? 'Sí' : 'No'}`);
      lines.push('');
    });
  }
 
  lines.push('════════════════════════════════════════════════════════════');
  lines.push(' ACCIONES RECOMENDADAS');
  lines.push('════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(' 1. Contactar manualmente los Leads de alto riesgo');
  lines.push(' 2. Verificar si el CRM finalmente sincronizó (puede haber delay)');
  lines.push(' 3. Loguear resultado: "recuperado" o "perdido"');
  lines.push(' 4. Si hay más de 5 Leads de alto riesgo: investigar causa raíz');
  lines.push('');
 
  return lines.join('\n');
}
 
/**
 * Punto de entrada del script.
 */
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find((arg) => arg.startsWith('--date='));
  const fecha = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
 
  console.log(`[Audit] Iniciando auditoría para ${fecha}...`);
 
  const leads = await obtenerLeadsEnFallback(fecha);
 
  const leadsConRiesgo = leads.map((lead) => ({
    ...lead,
    riesgoPerdida: evaluarRiesgoPerdida(lead),
  }));
 
  const reporte = generarReporte(leadsConRiesgo);
  console.log(reporte);
 
  // En producción: enviar reporte por email/Slack al equipo de Éxito del Cliente
  console.log(`[Audit] Auditoría completada. ${leadsConRiesgo.length} Leads revisados.`);
}
 
if (require.main === module) {
  main().catch((error) => {
    console.error('[Audit] Error:', error);
    process.exit(1);
  });
}
 
export { obtenerLeadsEnFallback, generarReporte, evaluarRiesgoPerdida };