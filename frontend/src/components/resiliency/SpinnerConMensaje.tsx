/**
 * components/resiliency/SpinnerConMensaje.tsx
 *
 * Feedback visual durante loading
 * RFC-003 Sección 4.3
 *
 * Este componente se muestra cuando el estado del formulario es 'loading' —
 * es decir, durante el intento primario de envío o durante los reintentos
 * de la Estrategia B.
 *
 * Principio de UX aplicado (RFC-003 Sección 1.2):
 *   "Tiempo máximo hasta notificar al usuario que se activó un fallback:
 *    < 3 segundos desde el primer fallo detectado"
 *
 * El spinner debe ser visible inmediatamente para que el usuario sepa que
 * el sistema está trabajando, incluso si la red está lenta o caída.
 *
 * Accesibilidad:
 *   - role="status" para que los lectores de pantalla anuncien el estado
 *   - aria-live="polite" para no interrumpir al usuario
 *   - Texto descriptivo que cambia según el tiempo transcurrido
 */
'use client';

import { useEffect, useState } from 'react';

interface SpinnerConMensajeProps {
  /** Mensaje inicial a mostrar */
  texto: string;
  /** Tiempo en ms antes de mostrar mensaje de "tardando más de lo esperado" */
  tiempoEsperaLarga?: number;
  /** Mensaje alternativo después de tiempoEsperaLarga */
  textoEsperaLarga?: string;
}

export default function SpinnerConMensaje({
  texto,
  tiempoEsperaLarga = 3000,
  textoEsperaLarga = 'Tardando un poco más de lo esperado... pero no se ha perdido su información.',
}: SpinnerConMensajeProps) {
  const [mostrarMensajeLargo, setMostrarMensajeLargo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarMensajeLargo(true);
    }, tiempoEsperaLarga);

    return () => clearTimeout(timer);
  }, [tiempoEsperaLarga]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="spinner-container flex flex-col items-center justify-center py-12"
    >
      {/* Spinner animado */}
      <div className="spinner mb-4">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-[#d97325] rounded-full animate-spin" />
      </div>

      {/* Mensaje principal */}
      <p className="text-lg text-gray-700 font-medium">
        {mostrarMensajeLargo ? textoEsperaLarga : texto}
      </p>

      {/* Nota de tranquilidad */}
      <p className="text-sm text-gray-500 mt-2">
        Su información está segura. Estamos intentando enviarla.
      </p>
    </div>
  );
}