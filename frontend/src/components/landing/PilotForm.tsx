/**
 * ============================================================================
 * PILOT FORM — Formulario con AbortController (RFC-HPBN, Capítulo 3)
 * ============================================================================
 * 
 * FUNCIÓN: Formulario de solicitud de Demo Phygital con timeout defensivo,
 * medición de latencia real, y degradación graceful.
 * 
 * PRINCIPIO APLICADO (Cap. 3):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea define 4 parámetros fundamentales de rendimiento: latencia,
 * throughput, utilización, y eficiencia. El principio 5.1.2 establece:
 * "To Measure Something Is to Change It" — el propio script de monitoreo
 * debe ser liviano para no distorsionar la métrica que intenta proteger.
 * 
 * DISEÑO CLAVE:
 *   • AbortController con timeout de 3 segundos (defensivo)
 *   • Medición de latencia con performance.now() (precisión sub-milisegundo)
 *   • Reporte a Datadog RUM si está disponible (Real User Monitoring)
 *   • Degradación graceful si timeout o error de red
 *   • Feedback visual inmediato al usuario (nunca dejar sin respuesta)
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 3: Web Performance Measurement
 *   • Principio 5.1.2: To Measure Something Is to Change It
 *   • Principio 5.1.10: Information Is Relative (TTFB de 100ms es excelente
 *     para WiFi de fibra pero mediocre para 4G con alta latencia de radio)
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • El formulario es el cierre de la Springboard Story ("¿Quieres tu
 *     propio Fin de Semana Piloto? Agenda la Demo Phygital hoy")
 *   • La respuesta 202 Accepted mantiene el momentum emocional sin hacer
 *     esperar al usuario
 * ============================================================================
 */

'use client';

import { useState } from 'react';

interface PilotFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PilotForm({ onSuccess, onError }: PilotFormProps) {
  const [formData, setFormData] = useState({
    whatsapp: '',
    establecimiento: '',
    ciudad: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    // AbortController con timeout defensivo de 3 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/edge/pilot-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      const latency = performance.now() - startTime;

      // Reportar latencia real a RUM (si Datadog está disponible)
      if (typeof window !== 'undefined' && (window as any).datadogRum) {
        (window as any).datadogRum.addAction('pilot_form_submit', {
          latency_ms: Math.round(latency),
          status: response.status,
        });
      }

      const data = await response.json();

      if (response.status === 202) {
        setStatus('success');
        onSuccess?.();
      } else if (response.status === 200 && data.status === 'duplicate') {
        setStatus('duplicate');
        setErrorMessage(data.message || 'Ya recibimos tu solicitud hoy.');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Error al enviar la solicitud.');
        onError?.(data.error);
      }
    } catch (err) {
      const latency = performance.now() - startTime;
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('error');
        setErrorMessage('La solicitud tardó demasiado. Por favor, intenta de nuevo.');
      } else {
        setStatus('error');
        setErrorMessage('Error de red. Verifica tu conexión e intenta de nuevo.');
      }
      
      onError?.(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-1">
          WhatsApp de contacto
        </label>
        <input
          id="whatsapp"
          type="tel"
          value={formData.whatsapp}
          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
          placeholder="+57 300 123 4567"
          required
          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
        />
      </div>

      <div>
        <label htmlFor="establecimiento" className="block text-sm font-medium text-gray-300 mb-1">
          Nombre del bar
        </label>
        <input
          id="establecimiento"
          type="text"
          value={formData.establecimiento}
          onChange={(e) => setFormData({ ...formData, establecimiento: e.target.value })}
          placeholder="Gastrobar El Rincón"
          required
          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
        />
      </div>

      <div>
        <label htmlFor="ciudad" className="block text-sm font-medium text-gray-300 mb-1">
          Ciudad
        </label>
        <input
          id="ciudad"
          type="text"
          value={formData.ciudad}
          onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
          placeholder="Medellín"
          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-[#d97325] hover:bg-[#c4641f] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
      >
        {status === 'submitting' ? 'Enviando...' : 'Agendar Demo Phygital'}
      </button>

      {status === 'success' && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-green-300">
          ✓ Solicitud recibida. Te contactaremos en menos de 24 horas.
        </div>
      )}

      {status === 'duplicate' && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-300">
          ⚠ {errorMessage}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          ✗ {errorMessage}
        </div>
      )}
    </form>
  );
}