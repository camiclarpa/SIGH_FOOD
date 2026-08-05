/**
 * ============================================================================
 * ESCENA CONCRETA — Principio CONCRETE (Made to Stick, Capítulo 3)
 * ============================================================================
 * 
 * FUNCIÓN: Componente base reutilizable para anclar ideas abstractas en
 * imágenes sensoriales y acciones humanas específicas.
 * 
 * CONCEPTO VERIFICADO (Capítulo 3):
 * ──────────────────────────────────────────────────────────────────────────
 * El cerebro recuerda sustantivos concretos mucho mejor que abstracciones.
 * 
 * Caso central del libro: The Nature Conservancy no podía comprar el 40% del
 * territorio ambientalmente crítico de California. En lugar de hablar de
 * "acres protegidos por año" (abstracto), nombró zonas concretas
 * ("Mount Hamilton Wilderness") — convirtiendo un objetivo administrativo
 * en algo que la gente podía imaginar y defender.
 * 
 * FÓRMULA DE CONCRECIÓN (verificada contra el RFC Made to Stick v2.0):
 * ──────────────────────────────────────────────────────────────────────────
 *   [SITUACIÓN ESPECÍFICA] + [NÚMERO CONCRETO] + [ACCIÓN HUMANA VISIBLE] + [OBJETO FÍSICO]
 * 
 * Cada escena concreta DEBE contener los 4 elementos de la fórmula:
 *   1. SITUACIÓN ESPECÍFICA: contexto temporal y espacial (ej: "viernes 11pm")
 *   2. NÚMERO CONCRETO: cifra específica (ej: "$587,500", no "mucho dinero")
 *   3. ACCIÓN HUMANA VISIBLE: persona haciendo algo (ej: "mesero entregando")
 *   4. OBJETO FÍSICO: objeto tangible (ej: "celular mostrando datos")
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 3 "Concrete" — Chip & Dan Heath
 *   • Ejemplo análogo: "Mount Hamilton Wilderness" vs "acres protegidos"
 *   • Principio: el lenguaje abstracto es el enemigo de la comprensión
 * 
 * PROPS REQUERIDAS:
 *   • titulo: Label de la sección (ej: "INCREMENTO DE TICKET PROMEDIO")
 *   • escena: Narrativa con situación temporal específica
 *   • cifra: Número concreto destacado (ej: "$587,500")
 *   • cifraDescripcion: Descripción de la cifra
 *   • accionHumana: Acción visible de una persona
 *   • objetoFisico: Objeto tangible
 *   • icono: (opcional) Icono visual de la escena
 * 
 * REGLA DE GOBIERNO:
 *   Cada cifra en el landing DEBE pasar esta fórmula. Si una cifra no tiene
 *   los 4 elementos, se reescribe hasta que los tenga.
 * ============================================================================
 */

'use client';

import { type ReactNode } from 'react';

interface EscenaConcretaProps {
  /** Label de la sección (ej: "INCREMENTO DE TICKET PROMEDIO") */
  titulo: string;
  /** Narrativa con situación temporal específica */
  escena: ReactNode;
  /** Número concreto destacado (ej: "$587,500") */
  cifra: string;
  /** Descripción de la cifra (ej: "pesos de utilidad esa sola noche") */
  cifraDescripcion: string;
  /** Acción visible de una persona */
  accionHumana: string;
  /** Objeto tangible */
  objetoFisico: string;
  /** Icono visual de la escena */
  icono?: ReactNode;
}

export function EscenaConcreta({
  titulo,
  escena,
  cifra,
  cifraDescripcion,
  accionHumana,
  objetoFisico,
  icono,
}: EscenaConcretaProps) {
  return (
    <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12 hover:border-[#d97325]/50 transition-all">
      
      {/* LABEL DE SECCIÓN */}
      <div className="text-gray-500 text-sm mb-4 tracking-widest uppercase font-medium">
        {titulo}
      </div>

      {/* ICONO (opcional) */}
      {icono && (
        <div className="mb-6 text-[#d97325]">
          {icono}
        </div>
      )}

      {/* ESCENA NARRATIVA */}
      <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8">
        {escena}
      </p>

      {/* CIFRA DESTACADA */}
      <div className="border-t border-gray-800 pt-6 mb-8">
        <div className="text-4xl md:text-5xl font-bold text-[#d97325] mb-2">
          {cifra}
        </div>
        <div className="text-gray-400 text-sm md:text-base">
          {cifraDescripcion}
        </div>
      </div>

      {/* ELEMENTOS CONCRETOS: Acción Humana + Objeto Físico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Acción visible
          </div>
          <div className="text-gray-200 text-sm">
            {accionHumana}
          </div>
        </div>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Objeto físico
          </div>
          <div className="text-gray-200 text-sm">
            {objetoFisico}
          </div>
        </div>
      </div>

    </div>
  );
}