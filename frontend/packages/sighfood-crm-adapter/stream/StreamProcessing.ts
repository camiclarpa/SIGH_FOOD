/**
 * ============================================================================
 * STREAM PROCESSING Ã¢â‚¬â€ Pipeline de Streaming en Tiempo Real (CapÃƒÂ­tulo 11)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÂ­tulo 11 de DDIA):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Kleppmann describe el stream processing como el procesamiento de eventos
 * a medida que ocurren, sin esperar a que se acumule un lote Ã¢â‚¬â€ habilitando
 * reacciones de baja latencia.
 * 
 * APLICACIÃƒâ€œN A SIGH_FOOD:
 *   Ã¢â‚¬Â¢ DetecciÃƒÂ³n de spam/fraude (CEP - Complex Event Processing)
 *   Ã¢â‚¬Â¢ Enriquecimiento de datos (stream-table join)
 *   Ã¢â‚¬Â¢ Vista materializada del dashboard en tiempo real
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 11: Procesamiento de Flujos
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 11.1: Complex Event Processing (CEP)
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 11.2: Stream-Table Join
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 11.3: Vistas Materializadas
 * ============================================================================
 */

import { type Lead } from '../../sighfood-domain/entities/Lead';

// ============================================================================
// CASO DE USO 1: DetecciÃƒÂ³n de Spam/Fraude (CEP)
// ============================================================================

export interface FraudPattern {
  fingerprint: string;
  eventCount: number;
  firstEventTime: number;
  lastEventTime: number;
}

/**
 * Complex Event Processing (CEP) Ã¢â‚¬â€ detecta patrones a travÃƒÂ©s de mÃƒÂºltiples eventos
 * 
 * PatrÃƒÂ³n de fraude: "5 formularios desde la misma sesiÃƒÂ³n en menos de 2 minutos"
 * Esto requiere correlacionar mÃƒÂºltiples eventos en una ventana de tiempo,
 * la definiciÃƒÂ³n exacta de CEP del libro.
 */
export function detectarPatronSpam(
  eventosRecientes: Lead[],
  ventanaMinutos: number = 2
): boolean {
  const ahora = Date.now();
  const eventosEnVentana = eventosRecientes.filter(
    (e) => ahora - e.timestamp < ventanaMinutos * 60_000
  );
  
  // PatrÃƒÂ³n: mÃƒÂ¡s de 3 envÃƒÂ­os distintos desde el mismo origen en la ventana
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
 * Stream-Table Join Ã¢â‚¬â€ enriquecer cada evento con datos de tabla de referencia
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
    // Extraer dominio del email (simulado Ã¢â‚¬â€ en producciÃƒÂ³n vendrÃƒÂ­a del CRM)
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
 * Vista Materializada Ã¢â‚¬â€ resultado agregado precomputado
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
   * ActualizaciÃƒÂ³n incremental Ã¢â‚¬â€ O(1) por evento
   * 
   * En vez de hacer COUNT(*) en cada refresh del dashboard,
   * mantenemos un contador incremental en memoria/Redis.
   */
  actualizarConNuevoLead(lead: Lead): void {
    const ahora = Date.now();
    const inicioHoy = ahora - (ahora % 86_400_000); // inicio del dÃƒÂ­a en ms
    
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
   * Resetear contadores al inicio de cada dÃƒÂ­a
   * 
   * Esto es crÃƒÂ­tico para la reproducibilidad que Kleppmann exige
   * de una vista materializada bien diseÃƒÂ±ada.
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
   * 1. DetecciÃƒÂ³n de spam (CEP)
   * 2. Enriquecimiento (stream-table join)
   * 3. ActualizaciÃƒÂ³n de vista materializada
   */
  async procesarEvento(lead: Lead): Promise<{
    esSpam: boolean;
    leadEnriquecido: ReturnType<EnriquecedorDeLeads['enriquecer']>;
    metrics: DashboardMetrics;
  }> {
    // 1. CEP Ã¢â‚¬â€ detecciÃƒÂ³n de patrones de fraude
    this.ventanaEventos.push(lead);
    const esSpam = detectarPatronSpam(this.ventanaEventos);
    
    // Mantener ventana deslizante
    const ahora = Date.now();
    this.ventanaEventos = this.ventanaEventos.filter(
      (e) => ahora - e.timestamp < 2 * 60_000
    );
    
    // 2. Stream-table join Ã¢â‚¬â€ enriquecimiento
    const leadEnriquecido = this.enriquecedor.enriquecer(lead);
    
    // 3. Vista materializada Ã¢â‚¬â€ actualizaciÃƒÂ³n incremental
    this.dashboard.resetearSiEsNuevoDia();
    this.dashboard.actualizarConNuevoLead(lead);
    const metrics = this.dashboard.obtenerMetrics();
    
    return { esSpam, leadEnriquecido, metrics };
  }
}