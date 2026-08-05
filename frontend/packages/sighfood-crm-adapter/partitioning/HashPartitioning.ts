/**
 * ============================================================================
 * HASH PARTITIONING - Estrategia de Particionamiento (DDIA, Capítulo 6)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (Capítulo 6):
 * ──────────────────────────────────────────────────────────────────────────
 * Kleppmann compara dos estrategias de particionamiento:
 * 
 * 1. Por rango de clave (range partitioning):
 *    • Ventaja: eficiente para consultas de rango (ej. "leads de Bogotá")
 *    • Riesgo: hot spots si las escrituras se concentran en un rango estrecho
 *      (ej. una campaña viral en una ciudad satura una partición)
 * 
 * 2. Por hash de clave (hash partitioning):
 *    • Ventaja: distribución uniforme de la carga de escritura
 *    • Desventaja: pierde la capacidad de hacer consultas de rango eficientes
 * 
 * DECISIÓN PARA SIGH_FOOD:
 *   Partición primaria por hash de `lead_id` para garantizar que ninguna
 *   campaña viral sature una sola partición. Las consultas por `campaign_id`
 *   o `city` se resuelven vía índices secundarios.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 6: Particionamiento
 *   • Sección 6.1: Particionamiento por rango vs. hash
 *   • Sección 6.2: Índices secundarios y particionamiento
 * ============================================================================
 */

import * as crypto from 'crypto';

export type PartitionKey = string;
export type PartitionId = number;

export interface PartitionConfig {
  readonly numPartitions: number;
  readonly hashFunction: 'md5' | 'sha256' | 'crc32';
}

const DEFAULT_CONFIG: PartitionConfig = {
  numPartitions: 16, // Suficiente para el volumen de SIGH_FOOD
  hashFunction: 'sha256',
};

/**
 * Calcula el ID de partición para un lead_id dado.
 * 
 * Fórmula: partition_id = hash(lead_id) % num_partitions
 * 
 * Esto garantiza que leads con IDs similares no necesariamente caigan en la
 * misma partición, evitando hot spots cuando una campaña genera muchos leads
 * con IDs secuenciales.
 */
export function getPartitionId(
  leadId: string,
  config: PartitionConfig = DEFAULT_CONFIG
): PartitionId {
  const hash = crypto.createHash(config.hashFunction).update(leadId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16); // Primeros 8 caracteres = 32 bits
  return hashInt % config.numPartitions;
}

/**
 * Estrategia de particionamiento por campaign_id (con riesgo de skew).
 * 
 * Kleppmann advierte que particionar por campaign_id puede generar hot spots
 * si una campaña de lanzamiento masivo concentra el 90%+ de los leads del día
 * en una sola partición.
 * 
 * Para SIGH_FOOD, esta estrategia NO se usa como partición primaria, pero
 * podría usarse como índice secundario para reportes de conversión por campaña.
 */
export function getPartitionIdByCampaign(
  campaignId: string,
  config: PartitionConfig = DEFAULT_CONFIG
): PartitionId {
  return getPartitionId(campaignId, config);
}

/**
 * Estrategia de particionamiento por ciudad (con riesgo de skew geográfico).
 * 
 * Bogotá y Medellín concentrarán muchísimos más leads que ciudades secundarias
 * del plan de expansión, generando skew en la distribución.
 * 
 * Para SIGH_FOOD, esta estrategia NO se usa como partición primaria, pero
 * podría usarse como índice secundario para el equipo comercial regional.
 */
export function getPartitionIdByCity(
  city: string,
  config: PartitionConfig = DEFAULT_CONFIG
): PartitionId {
  return getPartitionId(city, config);
}

/**
 * Verifica la distribución de leads entre particiones.
 * 
 * Esta función es útil para monitorear si el particionamiento por hash está
 * distribuyendo la carga uniformemente, o si existe skew inesperado.
 */
export function analyzePartitionDistribution(
  leadIds: string[],
  config: PartitionConfig = DEFAULT_CONFIG
): Map<PartitionId, number> {
  const distribution = new Map<PartitionId, number>();
  
  // Inicializar todas las particiones en 0
  for (let i = 0; i < config.numPartitions; i++) {
    distribution.set(i, 0);
  }
  
  // Contar leads por partición
  for (const leadId of leadIds) {
    const partitionId = getPartitionId(leadId, config);
    distribution.set(partitionId, (distribution.get(partitionId) || 0) + 1);
  }
  
  return distribution;
}