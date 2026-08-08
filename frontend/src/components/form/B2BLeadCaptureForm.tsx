/**
 * components/form/B2BLeadCaptureForm.tsx
 *
 * Componente de UI que usa B2BLeadFormPayload y maneja estados de envío.
 * Conecta la Calculadora de ROI con el endpoint /api/v1/leads/phygital-demo-request.
 */
'use client';

import { useState } from 'react';
import { z } from 'zod';
import { B2BLeadFormPayloadSchema } from '../../schemas/leadForm.schema';
import { EB2BRole } from '../../domain/enums/EB2BRole';
import { ELiquorCategory } from '../../domain/enums/ELiquorCategory';
import { ROICalculatorOutput } from '../../domain/roi/ROICalculatorOutput';
import ROICalculator from '../calculator/ROICalculator';

type FormPayload = z.infer<typeof B2BLeadFormPayloadSchema>;
type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface ValidationError {
  campo: string;
  mensaje: string;
}

export default function B2BLeadCaptureForm() {
  const [formData, setFormData] = useState<Partial<FormPayload>>({
    establecimiento: '',
    nombreTomadorDecision: '',
    rol: EB2BRole.GERENTE_AB,
    whatsapp: '',
    licoresDominantes: [],
  });

  const [roiCalculado, setRoiCalculado] = useState<ROICalculatorOutput | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [backendErrors, setBackendErrors] = useState<ValidationError[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  const handleRoiChange = (output: ROICalculatorOutput) => {
    setRoiCalculado(output);
  };

  const handleChange = <K extends keyof FormPayload>(field: K, value: FormPayload[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setBackendErrors((prev) => prev.filter((e) => e.campo !== field));
  };

  const handleLiquorToggle = (licor: ELiquorCategory) => {
    setFormData((prev) => {
      const current = prev.licoresDominantes || [];
      const updated = current.includes(licor)
        ? current.filter((l) => l !== licor)
        : [...current, licor];
      return { ...prev, licoresDominantes: updated };
    });
    setBackendErrors((prev) => prev.filter((e) => e.campo !== 'licoresDominantes'));
  };

  const validateClientSide = (): boolean => {
    if (!roiCalculado) {
      setGeneralError('Por favor, ajusta la calculadora de ROI antes de enviar.');
      return false;
    }

    const payloadToValidate: FormPayload = {
      ...formData,
      roiEstimadoAlMomentoDelEnvio: roiCalculado,
    } as FormPayload;

    const result = B2BLeadFormPayloadSchema.safeParse(payloadToValidate);

    if (!result.success) {
      const errors: ValidationError[] = result.error.issues.map((issue) => ({
        campo: issue.path.join('.') || 'root',
        mensaje: issue.message,
      }));
      setBackendErrors(errors);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setBackendErrors([]);

    if (!validateClientSide()) {
      return;
    }

    setStatus('submitting');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = performance.now();

    try {
      const payload: FormPayload = {
        ...formData,
        roiEstimadoAlMomentoDelEnvio: roiCalculado!,
      } as FormPayload;

      const response = await fetch('/api/v1/leads/phygital-demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latency = performance.now() - startTime;

      if (typeof window !== 'undefined' && window.datadogRum) {
        window.datadogRum.addAction('lead_form_submit', {
          latency_ms: Math.round(latency),
          status: response.status,
        });
      }

      const data = await response.json();

      if (response.status === 202) {
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/gracias';
        }, 500);
      } else if (response.status === 400 && data.codigo === 'VALIDATION_ERROR') {
        setBackendErrors(data.errores || []);
        setStatus('error');
      } else if (response.status === 429 && data.codigo === 'RATE_LIMITED') {
        setGeneralError('Demasiados intentos. Por favor, inténtalo en unos minutos.');
        setStatus('error');
      } else {
        setGeneralError(data.errores?.[0]?.mensaje || 'Error al enviar el formulario.');
        setStatus('error');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setGeneralError('La solicitud tardó demasiado. Por favor, intenta de nuevo.');
      } else {
        setGeneralError('Error de red. Verifica tu conexión e intenta de nuevo.');
      }
      setStatus('error');
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return backendErrors.find((e) => e.campo === fieldName)?.mensaje;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <ROICalculator onRoiChange={handleRoiChange} />

      <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8">
        <h3 className="text-2xl font-bold mb-6 text-[#f5f5f5]">
          Datos del establecimiento
        </h3>

        <div className="space-y-6">
          <div>
            <label htmlFor="establecimiento" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del establecimiento *
            </label>
            <input
              id="establecimiento"
              type="text"
              value={formData.establecimiento || ''}
              onChange={(e) => handleChange('establecimiento', e.target.value)}
              placeholder="Gastrobar El Rincón"
              className={`w-full bg-[#2a2a2a] border rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:ring-1 transition ${
                getFieldError('establecimiento')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-[#d97325] focus:ring-[#d97325]'
              }`}
            />
            {getFieldError('establecimiento') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError('establecimiento')}</p>
            )}
          </div>

          <div>
            <label htmlFor="nombreTomadorDecision" className="block text-sm font-medium text-gray-300 mb-2">
              Tu nombre *
            </label>
            <input
              id="nombreTomadorDecision"
              type="text"
              value={formData.nombreTomadorDecision || ''}
              onChange={(e) => handleChange('nombreTomadorDecision', e.target.value)}
              placeholder="Laura Martínez"
              className={`w-full bg-[#2a2a2a] border rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:ring-1 transition ${
                getFieldError('nombreTomadorDecision')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-[#d97325] focus:ring-[#d97325]'
              }`}
            />
            {getFieldError('nombreTomadorDecision') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError('nombreTomadorDecision')}</p>
            )}
          </div>

          <div>
            <label htmlFor="rol" className="block text-sm font-medium text-gray-300 mb-2">
              Tu rol en el establecimiento *
            </label>
            <select
              id="rol"
              value={formData.rol || EB2BRole.GERENTE_AB}
              onChange={(e) => handleChange('rol', e.target.value as EB2BRole)}
              className={`w-full bg-[#2a2a2a] border rounded-lg px-4 py-3 text-[#f5f5f5] focus:outline-none focus:ring-1 transition ${
                getFieldError('rol')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-[#d97325] focus:ring-[#d97325]'
              }`}
            >
              {Object.values(EB2BRole).map((rol) => (
                <option key={rol} value={rol}>
                  {rol.replace('_', ' ')}
                </option>
              ))}
            </select>
            {getFieldError('rol') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError('rol')}</p>
            )}
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-300 mb-2">
              WhatsApp de contacto *
            </label>
            <input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp || ''}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="+573001234567"
              className={`w-full bg-[#2a2a2a] border rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:ring-1 transition ${
                getFieldError('whatsapp')
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-[#d97325] focus:ring-[#d97325]'
              }`}
            />
            {getFieldError('whatsapp') && (
              <p className="text-red-400 text-sm mt-1">{getFieldError('whatsapp')}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Formato internacional: +57 para Colombia
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Licores más vendidos en tu carta *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(ELiquorCategory).map((licor) => (
                <label
                  key={licor}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    formData.licoresDominantes?.includes(licor)
                      ? 'bg-[#d97325]/10 border-[#d97325] text-[#f5f5f5]'
                      : 'bg-[#2a2a2a] border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.licoresDominantes?.includes(licor) || false}
                    onChange={() => handleLiquorToggle(licor)}
                    className="w-4 h-4 accent-[#d97325]"
                  />
                  <span className="text-sm">{licor.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
            {getFieldError('licoresDominantes') && (
              <p className="text-red-400 text-sm mt-2">{getFieldError('licoresDominantes')}</p>
            )}
          </div>
        </div>
      </div>

      {generalError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
          ✗ {generalError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className={`w-full font-bold py-4 rounded-lg transition-all transform shadow-lg ${
          status === 'submitting'
            ? 'bg-gray-700 cursor-not-allowed text-gray-400'
            : 'bg-[#d97325] hover:bg-[#c4641f] text-white hover:scale-[1.02]'
        }`}
      >
        {status === 'submitting' ? 'Enviando...' : 'Agendar Demo Phygital'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Al enviar este formulario, aceptas ser contactado por un asesor de SIGH_FOOD
        para agendar tu Demo Phygital.
      </p>
    </form>
  );
}