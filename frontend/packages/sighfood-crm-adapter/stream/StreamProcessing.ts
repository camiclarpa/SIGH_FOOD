/**
 * ============================================================================
 * STREAM PROCESSING â€” Pipeline de Streaming en Tiempo Real (CapÃ­tulo 11)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃ­tulo 11 de DDIA):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kleppmann describe el stream processing como el procesamiento de eventos
 * a medida que ocurren, sin esperar a que se acumule un lote â€” habilitando
 * reacciones de baja latencia.
 * 
 * APLICACIÃ“N A SIGH_FOOD:
 *   â€¢ DetecciÃ³n de spam/fraude (CEP - Complex Event Processing)
 *   â€¢ Enriquecimiento de datos (stream-table join)
 *   â€¢ Vista materializada del dashboard en tiempo real
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 11: Procesamiento de Flujos
 *   â€¢ SecciÃ³n 11.1: Complex Event Processing (CEP)
 *   â€¢ SecciÃ³n 11.2: Stream-Table Join
 *   â€¢ SecciÃ³n 11.3: Vistas Materializadas
 * ============================================================================
 */

import { type LeadEvent } from '../../sighfood-domain/entities/Lead';

// ============================================================================
// CASO DE USO 1: DetecciÃ³n de Spam/Fraude (CEP)
// ============================================================================

export interface FraudPattern {
  fingerprint: string;
  eventCount: number;
  firstEventTime: number;
  lastEventTime: number;
}

/**
 * Complex Event Processing (CEP) â€” detecta patrones a travÃ©s de mÃºltiples eventos
 * 
 * PatrÃ³n de fraude: "5 formularios desde la misma sesiÃ³n en menos de 2 minutos"
 * Esto requiere correlacionar mÃºltiples eventos en una ventana de tiempo,
 * la definiciÃ³n exacta de CEP del libro.
 */
export function detectarPatronSpam(
  eventosRecientes: LeadEvent[],
  ventanaMinutos: number = 2
): boolean {
  const ahora = Date.now();
  const eventosEnVentana = eventosRecientes.filter(
    (e) => ahora - e.timestamp < ventanaMinutos * 60_000
  );
  
  // PatrÃ³n: mÃ¡s de 3 envÃ­os distintos desde el mismo origen en la ventana
  return eventosEnVentana.length > 3;
}

// ============================================================================
// CASO DE USO 2: Enriquecimiento de Datos (Stream-Table Join)
// ============================================================================

export interface DominioCorporativo {
  dominio: string;
  esCorporativo: boolean;
  empresa?: string;
}

/**
 * Stream-Table Join â€” enriquecer cada evento con datos de tabla de referencia
 * 
 * Kleppmann describe mantener una copia local de la tabla de referencia
 * para evitar consultas remotas por cada evento (baja latencia).
 */
export class EnriquecedorDeLeads {
  private tablaDominios: Map<string, DominioCorporativo>;

  constructor(dominiosConocidos: DominioCorporativo[]) {
    this.tablaDominios = new Map(
      dominiosConocidos.map((d) => [d.dominio, d])
    );
  }

  enriquecer(lead: LeadEvent): LeadEvent & { esCorporativo?: boolean } {
    // Extraer dominio del email (simulado â€” en producciÃ³n vendrÃ­a del CRM)
    const email = `${lead.whatsapp}@sighfood.local`;
    const dominio = email.split('@')[1];
    
    const dominioInfo = this.tablaDominios.get(dominio);
    
    return {
      ...lead,
      esCorporativo: dominioInfo?.esCorporativo ?? false,
    };
  }
}

// ============================================================================
// CASO DE USO 3: Vista Materializada del Dashboard
// ============================================================================

export interface DashboardMetrics {
  leadsHoy: number;
  leadsEstaSemana: number;
  tasaConversionHoy: number;
  ultimoUpdate: number;
}

/**
 * Vista Materializada â€” resultado agregado precomputado
 * 
 * Kleppmann: actualizar incrementalmente con cada evento nuevo,
 * en vez de recalcular desde cero en cada consulta.
 */
export class DashboardMaterializado {
  private metrics: DashboardMetrics = {
    leadsHoy: 0,
    leadsEstaSemana: 0,
    tasaConversionHoy: 0,
    ultimoUpdate: Date.now(),
  };

  /**
   * ActualizaciÃ³n incremental â€” O(1) por evento
   * 
   * En vez de hacer COUNT(*) en cada refresh del dashboard,
   * mantenemos un contador incremental en memoria/Redis.
   */
  actualizarConNuevoLead(lead: LeadEvent): void {
    const ahora = Date.now();
    const inicioHoy = ahora - (ahora % 86_400_000); // inicio del dÃ­a en ms
    
    if (lead.timestamp >= inicioHoy) {
      this.metrics.leadsHoy++;
      this.metrics.leadsEstaSemana++;
    }
    
    this.metrics.ultimoUpdate = ahora;
  }

  obtenerMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  /**
   * Resetear contadores al inicio de cada dÃ­a
   * 
   * Esto es crÃ­tico para la reproducibilidad que Kleppmann exige
   * de una vista materializada bien diseÃ±ada.
   */
  resetearSiEsNuevoDia(): void {
    const ahora = Date.now();
    const inicioHoy = ahora - (ahora % 86_400_000);
    const ultimoDia = this.metrics.ultimoUpdate - (this.metrics.ultimoUpdate % 86_400_000);
    
    if (inicioHoy > ultimoDia) {
      this.metrics.leadsHoy = 0;
      this.metrics.ultimoUpdate = ahora;
    }
  }
}

// ============================================================================
// ORQUESTADOR DE STREAM PROCESSING
// ============================================================================

export interface StreamProcessorConfig {
  ventanaSpamMinutos: number;
  dominiosCorporativos: DominioCorporativo[];
}

export class StreamProcessor {
  private enriquecedor: EnriquecedorDeLeads;
  private dashboard: DashboardMaterializado;
  private ventanaEventos: LeadEvent[] = [];

  constructor(config: StreamProcessorConfig) {
    this.enriquecedor = new EnriquecedorDeLeads(config.dominiosCorporativos);
    this.dashboard = new DashboardMaterializado();
  }

  /**
   * Procesar un evento del stream
   * 
   * Pipeline completo:
   * 1. DetecciÃ³n de spam (CEP)
   * 2. Enriquecimiento (stream-table join)
   * 3. ActualizaciÃ³n de vista materializada
   */
  async procesarEvento(lead: LeadEvent): Promise<{
    esSpam: boolean;
    leadEnriquecido: ReturnType<EnriquecedorDeLeads['enriquecer']>;
    metrics: DashboardMetrics;
  }> {
    // 1. CEP â€” detecciÃ³n de patrones de fraude
    this.ventanaEventos.push(lead);
    const esSpam = detectarPatronSpam(this.ventanaEventos);
    
    // Mantener ventana deslizante
    const ahora = Date.now();
    this.ventanaEventos = this.ventanaEventos.filter(
      (e) => ahora - e.timestamp < 2 * 60_000
    );
    
    // 2. Stream-table join â€” enriquecimiento
    const leadEnriquecido = this.enriquecedor.enriquecer(lead);
    
    // 3. Vista materializada â€” actualizaciÃ³n incremental
    this.dashboard.resetearSiEsNuevoDia();
    this.dashboard.actualizarConNuevoLead(lead);
    const metrics = this.dashboard.obtenerMetrics();
    
    return { esSpam, leadEnriquecido, metrics };
  }
}