/**
 * ============================================================================
 * DOMAIN INDEX — SAP: Stable Abstractions Principle
 * ============================================================================
 * 
 * PRINCIPIO SAP (Capítulo 14):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob establece que un componente estable debe ser también abstracto,
 * para que su estabilidad no impida la extensión del sistema. Un componente
 * estable pero concreto es rígido — no se puede extender sin modificarlo.
 * 
 * APLICACIÓN:
 *   sighfood-domain, precisamente por ser el componente más estable, expone
 *   principalmente interfaces (abstracciones) en vez de implementaciones
 *   concretas. Su estabilidad no bloquea la extensión, porque nuevas
 *   implementaciones (nuevos CRMs, nuevas UIs) pueden añadirse sin tocarlo.
 * 
 * EXPORTS PÚBLICOS DEL DOMINIO:
 *   • Entidades (Lead, Cono) — reglas de negocio empresariales
 *   • Casos de Uso (AgendarDemoUseCase) — orquestación específica
 *   • Interfaces (LeadRepository, ValidadorFormulario) — abstracciones
 *   • Funciones Puras (calcularRoi, validarFormulario) — reglas inmutables
 * 
 * NO EXPORTA:
 *   • Implementaciones concretas de repositorios (viven en crm-adapter)
 *   • Componentes de UI (viven en sighfood-ui)
 * ============================================================================
 */

// Entities
export * from './entities/Lead';
export * from './entities/Cono';

// Use Cases
export * from './useCases/AgendarDemoUseCase';

// Rules (Funciones Puras)
export * from './rules/calcularRoi';
export * from './rules/validarFormularioLead';

// Ports (Interfaces/Abstracciones)
export * from './ports/LeadRepository';
export * from './ports/ValidadorFormulario';
export * from './ports/NotificadorLead';

// Value Objects (si existen)
// export * from './valueObjects/WhatsApp';
// export * from './valueObjects/Email';

// Events (si existen)
// export * from './events/LeadCreado';

// Errors (si existen)
// export * from './errors/DomainError';