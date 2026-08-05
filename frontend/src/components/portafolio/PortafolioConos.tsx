/**
 * ============================================================================
 * PORTAFOLIO CONOS — OCP: Catálogo como dato, no código (Clean Arch. Cap. 8)
 * RFC-001: Capa Edge — Contenido estático SSG
 * ============================================================================
 * 
 * PRINCIPIO OCP (Clean Architecture Capítulo 8):
 *   Un módulo debe estar abierto para extensión pero cerrado para modificación.
 *   Añadir un 6to cono es AGREGAR una entrada al arreglo — CERO modificación
 *   del componente que renderiza el portafolio.
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • Cada cono tiene su Connection Plot (Diego + Sweet & Salty Caramel)
 *   • Los maridajes son concretos, no abstractos (Concrete - Cap. 3)
 * ============================================================================
 */

'use client';

import { useState } from 'react';

interface Cono {
  readonly id: string;
  readonly nombre: string;
  readonly maridaje: string[];
  readonly tiempoEnsambleSegundos: number;
  readonly descripcion: string;
  readonly precioVentaCOP: number;
  readonly costoAdquisicionCOP: number;
}

const PORTAFOLIO_CONOS: readonly Cono[] = Object.freeze([
  {
    id: 'spicy-volcano',
    nombre: 'The Spicy Volcano Cone',
    maridaje: ['Mezcal', 'Tequila'],
    tiempoEnsambleSegundos: 18,
    descripcion: 'Crujiente, picante, con elixir de chile y limón.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'sweet-salty-caramel',
    nombre: 'Sweet & Salty Caramel Cone',
    maridaje: ['Bourbon', 'Whisky'],
    tiempoEnsambleSegundos: 17,
    descripcion: 'Caramelo salado que eleva las notas de vainilla del barril.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'herbal-citrus',
    nombre: 'Herbal Citrus Botanical Cone',
    maridaje: ['Gin-Tonic'],
    tiempoEnsambleSegundos: 19,
    descripcion: 'Botánicos frescos que complementan la ginebra.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'smoked-cheese-truffle',
    nombre: 'Smoked Cheese & Truffle Cone',
    maridaje: ['Vino Tinto', 'Espumoso'],
    tiempoEnsambleSegundos: 20,
    descripcion: 'Umami profundo para vinos estructurados.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'tropical-anise',
    nombre: 'Tropical Anise & Fusion Cone',
    maridaje: ['Ron Añejo'],
    tiempoEnsambleSegundos: 18,
    descripcion: 'Tropical con anís, perfecto para ron añejo.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
]);

export default function PortafolioConos() {
  const [selectedCono, setSelectedCono] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PORTAFOLIO_CONOS.map((cono) => (
        <div
          key={cono.id}
          onClick={() => setSelectedCono(cono.id)}
          className={`bg-[#1f1f1f] border-2 rounded-lg p-6 cursor-pointer transition-all ${
            selectedCono === cono.id
              ? 'border-[#d97325] shadow-lg shadow-[#d97325]/20'
              : 'border-gray-800 hover:border-[#d97325]/50'
          }`}
        >
          <h3 className="text-xl font-bold text-[#f5f5f5] mb-3">
            {cono.nombre}
          </h3>
          
          <p className="text-gray-400 text-sm mb-4">
            {cono.descripcion}
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Maridaje:</span>
              <span className="text-[#d97325] font-semibold">
                {cono.maridaje.join(', ')}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500">Ensamble:</span>
              <span className="text-[#f5f5f5]">
                {cono.tiempoEnsambleSegundos}s
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500">Margen:</span>
              <span className="text-green-400 font-bold">
                {Math.round(((cono.precioVentaCOP - cono.costoAdquisicionCOP) / cono.precioVentaCOP * 100))}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}