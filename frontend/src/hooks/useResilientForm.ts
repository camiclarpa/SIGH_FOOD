'use client';

import { useState, useEffect, useCallback } from 'react';
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

export function useResilientForm() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<LeadData | null>(null);

  // 1. Detectar cambios en la conexión de red
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Intentar reenviar automáticamente si hay datos pendientes
      if (pendingData) {
        handleSubmit(pendingData, true);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Revisar si hay datos pendientes al montar el componente
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPendingData(JSON.parse(saved));
        setSubmitError("Sin conexión. Datos guardados localmente.");
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingData]);

  // 2. Función principal de envío
  const handleSubmit = useCallback(async (data: LeadData, isRetry: boolean = false) => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Si no hay internet y no es un reintento automático, guardar y salir
    if (!isOnline && !isRetry) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPendingData(data);
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
      setPendingData(null);
      setSubmitError(null);
      setIsSubmitting(false);
      
      return { success: true, data: result };

    } catch (error) {
      // Fallo: guardar en localStorage como respaldo
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPendingData(data);
      setSubmitError("Error de red. Datos guardados localmente.");
      setIsSubmitting(false);
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }, [isOnline]);

  // 3. Generar enlace de fallback para WhatsApp
  const whatsappLink = pendingData ? generateWhatsAppFallbackLink(pendingData, SALES_WHATSAPP) : null;

  return {
    isOnline,
    isSubmitting,
    submitError,
    pendingData,
    whatsappLink,
    handleSubmit,
    clearPending: () => {
      localStorage.removeItem(STORAGE_KEY);
      setPendingData(null);
      setSubmitError(null);
    }
  };
}