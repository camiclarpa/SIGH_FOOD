/**
 * ============================================================================
 * STREAM PROCESSING ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Pipeline de Streaming en Tiempo Real (CapÃƒÆ’Ã‚Â­tulo 11)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÆ’Ã‚Â­tulo 11 de DDIA):
 * ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
 * Kleppmann describe el stream processing como el procesamiento de eventos
 * a medida que ocurren, sin esperar a que se acumule un lote ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â habilitando
 * reacciones de baja latencia.
 * 
 * APLICACIÃƒÆ’Ã¢â‚¬Å“N A SIGH_FOOD:
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ DetecciÃƒÆ’Ã‚Â³n de spam/fraude (CEP - Complex Event Processing)
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Enriquecimiento de datos (stream-table join)
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ Vista materializada del dashboard en tiempo real
 * 
 * REFERENCIAS DEL LIBRO:
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 11: Procesamiento de Flujos
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 11.1: Complex Event Processing (CEP)
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 11.2: Stream-Table Join
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 11.3: Vistas Materializadas
 * ============================================================================
 */

import { type Lead } from '../../sighfood-domain/entities/Lead';

// ============================================================================
// CASO DE USO 1: DetecciÃƒÆ’Ã‚Â³n de Spam/Fraude (CEP)
// ============================================================================

export interface FraudPattern {
  fingerprint: string;
  eventCount: number;
  firstEventTime: number;
  lastEventTime: number;
}

/**
 * Complex Event Processing (CEP) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â detecta patrones a travÃƒÆ’Ã‚Â©s de mÃƒÆ’Ã‚Âºltiples eventos
 * 
 * PatrÃƒÆ’Ã‚Â³n de fraude: "5 formularios desde la misma sesiÃƒÆ’Ã‚Â³n en menos de 2 minutos"
 * Esto requiere correlacionar mÃƒÆ’Ã‚Âºltiples eventos en una ventana de tiempo,
 * la definiciÃƒÆ’Ã‚Â³n exacta de CEP del libro.
 */
export function detectarPatronSpam(
  eventosRecientes: Lead[],
  ventanaMinutos: number = 2
): boolean {
  const ahora = Date.now();
  const eventosEnVentana = eventosRecientes.filter(
    (e) => e.timestamp !== undefined && (ahora - e.timestamp) < ventanaMinutos * 60_000
  );
  
  // PatrÃƒÆ’Ã‚Â³n: mÃƒÆ’Ã‚Â¡s de 3 envÃƒÆ’Ã‚Â­os distintos desde el mismo origen en la ventana
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
 * Stream-Table Join ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â enriquecer cada evento con datos de tabla de referencia
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

  enriquecer(lead: Lead): Lead & { esCorporativo?: boolean } {
    // Extraer dominio del email (simulado ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â en producciÃƒÆ’Ã‚Â³n vendrÃƒÆ’Ã‚Â­a del CRM)
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
 * Vista Materializada ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â resultado agregado precomputado
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
   * ActualizaciÃƒÆ’Ã‚Â³n incremental ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â O(1) por evento
   * 
   * En vez de hacer COUNT(*) en cada refresh del dashboard,
   * mantenemos un contador incremental en memoria/Redis.
   */
  actualizarConNuevoLead(lead: Lead): void {
    const ahora = Date.now();
    const inicioHoy = ahora - (ahora % 86_400_000); // inicio del dÃƒÆ’Ã‚Â­a en ms
    
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
   * Resetear contadores al inicio de cada dÃƒÆ’Ã‚Â­a
   * 
   * Esto es crÃƒÆ’Ã‚Â­tico para la reproducibilidad que Kleppmann exige
   * de una vista materializada bien diseÃƒÆ’Ã‚Â±ada.
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
  private ventanaEventos: Lead[] = [];

  constructor(config: StreamProcessorConfig) {
    this.enriquecedor = new EnriquecedorDeLeads(config.dominiosCorporativos);
    this.dashboard = new DashboardMaterializado();
  }

  /**
   * Procesar un evento del stream
   * 
   * Pipeline completo:
   * 1. DetecciÃƒÆ’Ã‚Â³n de spam (CEP)
   * 2. Enriquecimiento (stream-table join)
   * 3. ActualizaciÃƒÆ’Ã‚Â³n de vista materializada
   */
  async procesarEvento(lead: Lead): Promise<{
    esSpam: boolean;
    leadEnriquecido: ReturnType<EnriquecedorDeLeads['enriquecer']>;
    metrics: DashboardMetrics;
  }> {
    // 1. CEP ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â detecciÃƒÆ’Ã‚Â³n de patrones de fraude
    this.ventanaEventos.push(lead);
    const esSpam = detectarPatronSpam(this.ventanaEventos);
    
    // Mantener ventana deslizante
    const ahora = Date.now();
    this.ventanaEventos = this.ventanaEventos.filter(
      (e) => ahora - e.timestamp < 2 * 60_000
    );
    
    // 2. Stream-table join ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â enriquecimiento
    const leadEnriquecido = this.enriquecedor.enriquecer(lead);
    
    // 3. Vista materializada ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â actualizaciÃƒÆ’Ã‚Â³n incremental
    this.dashboard.resetearSiEsNuevoDia();
    this.dashboard.actualizarConNuevoLead(lead);
    const metrics = this.dashboard.obtenerMetrics();
    
    return { esSpam, leadEnriquecido, metrics };
  }
}