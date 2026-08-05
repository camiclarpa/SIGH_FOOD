/**
 * BLOQUES CREDIBILIDAD — Escala Humana + Food Cost (Made to Stick Cap. 4)
 * RFC-001: Capa Edge — Contenido estático SSG
 */

'use client';

export default function BloquesCredibilidad() {
  return (
    <div className="space-y-8">
      {/* Escala Humana */}
      <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-gray-500 text-sm tracking-widest uppercase font-medium">
            Margen por unidad
          </div>
          <span className="text-xs px-2 py-1 rounded border bg-blue-900/30 text-blue-300 border-blue-800">
            Escala Humana
          </span>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">En lugar de decir:</div>
          <div className="text-gray-500 line-through text-lg">73.4% de margen neto por unidad</div>
        </div>

        <div className="mb-8">
          <div className="text-xs text-[#d97325] uppercase tracking-wider mb-2 font-semibold">Decimos:</div>
          <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5] leading-tight">
            De cada <span className="text-[#d97325] font-bold">$10,000 pesos</span> que su comensal paga por el cono,
            más de <span className="text-[#d97325] font-bold">$7,300 se quedan en su caja</span> — no en la nuestra.
          </div>
        </div>
      </div>

      {/* Food Cost Comparado */}
      <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-gray-500 text-sm tracking-widest uppercase font-medium">
            Food Cost comparado
          </div>
          <span className="text-xs px-2 py-1 rounded border bg-emerald-900/30 text-emerald-300 border-emerald-800">
            Detalle Verificable
          </span>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">En lugar de decir:</div>
          <div className="text-gray-500 line-through text-lg">Food Cost 26.6% por unidad</div>
        </div>

        <div className="mb-8">
          <div className="text-xs text-[#d97325] uppercase tracking-wider mb-2 font-semibold">Decimos:</div>
          <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5] leading-tight">
            El Food Cost de este producto es más bajo que el de una{' '}
            <span className="text-[#d97325] font-bold">tabla de quesos tradicional con trufa fresca</span>
            {' '}— sin que usted tenga que negociar con un proveedor de trufa cada semana.
          </div>
        </div>
      </div>
    </div>
  );
}