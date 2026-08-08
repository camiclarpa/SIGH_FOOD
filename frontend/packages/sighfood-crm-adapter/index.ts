/**
 * ============================================================================
 * CRM ADAPTER INDEX — Punto de entrada público del paquete de adaptadores
 * ============================================================================
 *
 * `package.json` declara `main`/`types` apuntando a este archivo, así que es
 * la única superficie que los consumidores deberían importar.
 *
 * Nota: `HubSpotLeadRepository.ts` y `PipedriveLeadRepository.ts` existen
 * también en la raíz del paquete, duplicando las clases de `repositories/`.
 * Solo se exportan las de `repositories/`, que son las que implementan el
 * puerto `LeadRepository` del dominio; las de la raíz quedan sin exportar
 * hasta que se decida eliminarlas.
 * ============================================================================
 */

// Repositorios (implementaciones del puerto LeadRepository)
export * from './repositories/PipedriveLeadRepository';
export * from './repositories/HubSpotLeadRepository';

// Controladores
export * from './FormularioLeadController';

// Consistencia e idempotencia
export * from './consistency/Idempotency';

// Transacciones (patrón outbox)
export * from './transactions/OutboxPattern';

// Particionamiento
export * from './partitioning/HashPartitioning';

// Replicación
export * from './replication/AsyncReplication';

// Procesamiento de streams
export * from './stream/StreamProcessing';

// Procesamiento por lotes
export * from './batch/BatchProcessing';
