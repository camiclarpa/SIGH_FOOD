'use client';

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { generateWhatsAppFallbackLink } from '@/lib/whatsapp';

const STORAGE_KEY = 'sighfood_pending_leads';
const SALES_WHATSAPP = "573001234567"; // Cambiar por el número real

export interface LeadData {
  establishmentName: string;
  decisionMaker: string;
  phone: string;
  topLiquors: string;
  estimatedWeeklyVolume: number;
}

export interface SubmitResult {
  success: boolean;
  offline?: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Estado de red expuesto como store externo. Evita el desajuste de hidratación
 * de leer `navigator.onLine` durante el render: en el servidor asumimos que hay
 * conexión y el cliente se sincroniza solo.
 */
function subscribeToNetwork(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getOnlineSnapshot = () => navigator.onLine;
const getOnlineServerSnapshot = () => true;

export function useResilientForm() {
  const isOnline = useSyncExternalStore(
    subscribeToNetwork,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<LeadData | null>(null);

  // Espejo de `pendingData` para que el reintento automático pueda leer el
  // valor actual sin tener que figurar como dependencia de los efectos.
  const pendingDataRef = useRef<LeadData | null>(null);

  const setPending = useCallback((data: LeadData | null) => {
    pendingDataRef.current = data;
    setPendingData(data);
  }, []);

  // 1. Función principal de envío
  const handleSubmit = useCallback(
    async (data: LeadData, isRetry: boolean = false): Promise<SubmitResult> => {
      setIsSubmitting(true);
      setSubmitError(null);

      // Si no hay internet y no es un reintento automático, guardar y salir.
      // Se consulta `navigator.onLine` y no el estado del render para usar el
      // valor del instante del envío.
      if (!navigator.onLine && !isRetry) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setPending(data);
        setSubmitError("Sin conexión. Datos guardados localmente.");
        setIsSubmitting(false);
        return { success: false, offline: true };
      }

      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const result = await response.json();

        // Éxito: limpiar estado pendiente
        localStorage.removeItem(STORAGE_KEY);
        setPending(null);
        setSubmitError(null);
        setIsSubmitting(false);

        return { success: true, data: result };

      } catch (error) {
        // Fallo: guardar en localStorage como respaldo
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setPending(data);
        setSubmitError("Error de red. Datos guardados localmente.");
        setIsSubmitting(false);

        return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
      }
    },
    [setPending],
  );

  // 2. Rehidratar los datos pendientes del envío anterior, una sola vez al montar.
  //    Tiene que ser un efecto y no un inicializador de `useState`: leer
  //    localStorage durante el render rompería la hidratación, porque el
  //    servidor no lo ve y renderizaría un árbol distinto.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación desde localStorage; ver comentario arriba
      setPending(JSON.parse(saved) as LeadData);
      setSubmitError("Sin conexión. Datos guardados localmente.");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [setPending]);

  // 3. Reintentar automáticamente al recuperar la conexión.
  //    Solo en la transición offline → online, no en cada render.
  const wasOnlineRef = useRef(true);
  useEffect(() => {
    const recuperoConexion = isOnline && !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (recuperoConexion && pendingDataRef.current) {
      void handleSubmit(pendingDataRef.current, true);
    }
  }, [isOnline, handleSubmit]);

  // 4. Generar enlace de fallback para WhatsApp
  const whatsappLink = pendingData ? generateWhatsAppFallbackLink(pendingData, SALES_WHATSAPP) : null;

  const clearPending = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPending(null);
    setSubmitError(null);
  }, [setPending]);

  return {
    isOnline,
    isSubmitting,
    submitError,
    pendingData,
    whatsappLink,
    handleSubmit,
    clearPending,
  };
}
