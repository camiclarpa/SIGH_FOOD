/**
 * ============================================================================
 * UI INDEX — Punto de entrada público del paquete de componentes
 * ============================================================================
 *
 * `package.json` declara `main`/`types` apuntando a este archivo, así que es
 * la única superficie que los consumidores (`@sighfood/web`, la landing de
 * `src/`) deberían importar.
 *
 * NO EXPORTA:
 *   • Reglas de negocio — viven en @sighfood/domain
 *   • Adaptadores de CRM — viven en @sighfood/crm-adapter
 * ============================================================================
 */

export * from './components/CalculadoraRoi';
export * from './components/TarjetaCono';
