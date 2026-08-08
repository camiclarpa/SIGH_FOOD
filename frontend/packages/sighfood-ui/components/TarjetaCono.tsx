/**
 * ============================================================================
 * TARJETA CONO — LSP: Componentes Intercambiables sin Romper la Lógica
 * ============================================================================
 * 
 * PRINCIPIO LSP (Capítulo 9):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob traduce el principio original de Barbara Liskov (sobre subtipos)
 * a una regla de diseño de componentes: las partes intercambiables de un
 * sistema deben adherirse a un contrato que permita que esas partes sean
 * sustituidas unas por otras sin sorprender al usuario del sistema.
 * 
 * APLICACIÓN:
 *   Dos implementaciones de tarjeta de producto (Compacta vs Expandida) que
 *   cumplen el mismo contrato de props — el componente padre (Portafolio)
 *   puede recibir CUALQUIERA de las dos sin romperse.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 9: LSP — Principio de Sustitución de Liskov
 *   • Capítulo 10: ISP — Interfaces segregadas
 * 
 * VIOLACIÓN DE LSP A EVITAR:
 *   Si TarjetaConoExpandida esperara silenciosamente una prop adicional no
 *   declarada en el contrato (ej. asumiendo que cono.maridaje siempre tiene
 *   exactamente 2 elementos), sustituirla por TarjetaConoCompacta rompería
 *   el sistema de forma sorpresiva.
 * ============================================================================
 */

import { type Cono, PORTAFOLIO_CONOS } from '../../sighfood-domain/entities/Cono';

/**
 * CONTRATO COMÚN — Todas las tarjetas de producto deben cumplirlo
 * 
 * Este es el "contrato de interfaz" que permite el intercambio sin sorpresas.
 */
export interface TarjetaProductoProps {
  readonly cono: Cono;
  readonly onSeleccionar: (conoId: string) => void;
  readonly variante?: 'compacta' | 'expandida';
}

/**
 * TARJETA COMPACTA — Implementación 1 del contrato
 * 
 * Diseño minimalista, ideal para grids densos o vista móvil.
 */
export function TarjetaConoCompacta({ cono, onSeleccionar }: TarjetaProductoProps) {
  return (
    <div 
      className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-4 hover:border-[#d97325] transition cursor-pointer"
      onClick={() => onSeleccionar(cono.id)}
    >
      <h3 className="text-lg font-bold text-[#f5f5f5] mb-2">{cono.nombre}</h3>
      <p className="text-sm text-gray-400 mb-2">
        Maridaje: {cono.maridaje.join(', ')}
      </p>
      <p className="text-xs text-gray-500">
        {cono.tiempoEnsambleSegundos}s de ensamble
      </p>
    </div>
  );
}

/**
 * TARJETA EXPANDIDA — Implementación 2 del contrato
 * 
 * Diseño detallado, ideal para vista desktop o featured products.
 * 
 * NOTA: Esta implementación NO asume nada sobre el número de elementos
 * en cono.maridaje — cumple el contrato exactamente como TarjetaConoCompacta.
 */
export function TarjetaConoExpandida({ cono, onSeleccionar }: TarjetaProductoProps) {
  const utilidadNetaCOP = cono.precioVentaCOP - cono.costoAdquisicionCOP;
  
  return (
    <div 
      className="bg-[#1f1f1f] border-2 border-gray-800 rounded-lg p-6 hover:border-[#d97325] transition cursor-pointer"
      onClick={() => onSeleccionar(cono.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-[#f5f5f5]">{cono.nombre}</h3>
        <span className="text-xl font-bold text-[#d97325]">
          ${cono.precioVentaCOP.toLocaleString('es-CO')} COP
        </span>
      </div>
      
      <p className="text-gray-300 mb-4">{cono.descripcion}</p>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase mb-1">Maridaje</div>
          <div className="text-sm text-[#f5f5f5]">
            {cono.maridaje.map((licor, idx) => (
              <span key={licor}>
                {licor}
                {idx < cono.maridaje.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
        
        <div className="bg-[#0f0f0f] rounded-lg p-3">
          <div className="text-xs text-gray-500 uppercase mb-1">Utilidad Neta</div>
          <div className="text-sm text-[#d97325] font-bold">
            ${utilidadNetaCOP.toLocaleString('es-CO')} COP
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Ensamble: {cono.tiempoEnsambleSegundos} segundos</span>
        <button 
          className="bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-2 px-4 rounded transition"
          onClick={(e) => {
            e.stopPropagation();
            onSeleccionar(cono.id);
          }}
        >
          Seleccionar
        </button>
      </div>
    </div>
  );
}

/**
 * PORTFOLIO — Componente que usa cualquier implementación del contrato
 * 
 * Este componente NO sabe cuál de las dos tarjetas está renderizando —
 * ambas cumplen el mismo contrato, cumpliendo LSP.
 */
export function PortafolioConos({ 
  TarjetaComponente 
}: { 
  TarjetaComponente: React.FC<TarjetaProductoProps> 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PORTAFOLIO_CONOS.map((cono: Cono) => (
        <TarjetaComponente 
          key={cono.id} 
          cono={cono} 
          onSeleccionar={(id) => console.log('Seleccionado:', id)}
        />
      ))}
    </div>
  );
}