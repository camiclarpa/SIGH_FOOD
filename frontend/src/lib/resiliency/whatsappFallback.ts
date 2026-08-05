/**
 * lib/resiliency/whatsappFallback.ts
 *
 * Estrategia C: Canal Alternativo (WhatsApp Fallback)
 * RFC-003 Sección 3.3
 *
 * Objetivo: cuando las Estrategias A (LocalStorage) y B (Reintentos +
 * Background Sync) se agotan, se presenta al usuario un botón que abre
 * WhatsApp con un mensaje pre-llenado con todos los datos ya capturados.
 *
 * El usuario solo necesita presionar "Enviar" en WhatsApp — sin volver a
 * escribir nada. Esto minimiza la fricción en el momento más crítico del
 * funnel, cuando el usuario ya invirtió tiempo completando el formulario.
 *
 * FMEA cubierto:
 *   - F4 (QuotaExceededError): cuando LocalStorage no puede guardar el Lead
 *   - F5 (Cierre de pestaña): si Background Sync también falló
 *   - F6 (Navegador sin soporte): si el dispositivo no soporta Service Workers
 *
 * Principio de diseño (RFC-003 Sección 3.3):
 *   Los campos usados en el fallback de WhatsApp son EXACTAMENTE los mismos
 *   del B2BLeadFormPayload (RFC-002 Sección 4) — ningún campo nuevo,
 *   ninguna estructura de datos paralela. Esto garantiza consistencia entre
 *   lo que el usuario ve en el formulario y lo que el vendedor recibe.
 *
 * Nota de UX (RFC-003 Sección 3.3):
 *   Este banner solo se muestra después de que las Estrategias A y B se
 *   agotaron — nunca se presenta como la opción primaria, para no sugerir
 *   al usuario que el formulario web "no funciona". Se enmarca explícitamente
 *   como "ya guardamos su información" para reducir la ansiedad de que el
 *   dato se haya perdido.
 */

import type { B2BLeadFormPayloadInferred } from '../../domain/leads/B2BLeadFormPayload';

/**
 * Número de WhatsApp comercial de SIGH_FOOD — canal de ventas directo.
 *
 * Formato: código de país (57 para Colombia) + número, sin '+' ni espacios.
 * Este número debe coincidir con el registrado en WhatsApp Business API
 * para que el mensaje llegue al equipo de ventas correcto.
 *
 * TODO: Reemplazar con el número real de ventas de SIGH_FOOD antes de
 * poner en producción.
 */
const NUMERO_WHATSAPP_COMERCIAL = '573001234567';

/**
 * Construye el enlace de WhatsApp con los datos del formulario ya
 * codificados en la URL.
 *
 * El vendedor recibe el mensaje exactamente como si el Gerente de A&B
 * lo hubiera escrito a mano — sin perder ningún campo, sin formato
 * roto, sin caracteres mal codificados.
 *
 * Estructura del mensaje:
 *   1. Saludo + intención (primera línea, clara y directa)
 *   2. Línea en blanco (separador visual)
 *   3. Datos del establecimiento y tomador de decisión
 *   4. Licores dominantes (para personalizar el kit de cata)
 *   5. ROI estimado (el "Anclaje Financiero" — el vendedor cita esta cifra)
 *
 * @param payload - El payload completo del formulario B2B
 * @returns URL de WhatsApp con el mensaje pre-llenado, lista para abrir
 */
export function construirEnlaceWhatsAppFallback(
  payload: B2BLeadFormPayloadInferred
): string {
  // Construir el mensaje línea por línea para máxima legibilidad
  const mensaje = [
    `Hola, quiero agendar la Demo Phygital de SIGH_FOOD.`,
    ``,
    `Establecimiento: ${payload.establecimiento}`,
    `Tomador de decisión: ${payload.nombreTomadorDecision} (${payload.rol})`,
    `Licores dominantes en mi carta: ${payload.licoresDominantes.join(', ')}`,
    `Ganancia neta mensual estimada (calculadora): $${payload.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP.toLocaleString('es-CO')} COP`,
  ].join('\n');

  // Codificar el mensaje para URL (maneja espacios, acentos, saltos de línea)
  const mensajeCodificado = encodeURIComponent(mensaje);

  // Construir la URL final de WhatsApp
  return `https://wa.me/${NUMERO_WHATSAPP_COMERCIAL}?text=${mensajeCodificado}`;
}

/**
 * Construye un mensaje de WhatsApp más compacto, útil cuando el payload
 * es muy largo y se quiere asegurar que quepa en un solo mensaje de WhatsApp
 * (límite práctico: ~65,536 caracteres, pero mensajes cortos tienen mejor
 * tasa de lectura).
 *
 * @param payload - El payload completo del formulario B2B
 * @returns URL de WhatsApp con mensaje compacto
 */
export function construirEnlaceWhatsAppCompacto(
  payload: B2BLeadFormPayloadInferred
): string {
  const mensaje = [
    `Demo Phygital SIGH_FOOD`,
    `${payload.establecimiento} - ${payload.nombreTomadorDecision}`,
    `ROI: $${payload.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP.toLocaleString('es-CO')} COP/mes`,
  ].join(' | ');

  const mensajeCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${NUMERO_WHATSAPP_COMERCIAL}?text=${mensajeCodificado}`;
}

/**
 * Valida que el número de WhatsApp comercial tenga el formato correcto.
 *
 * Se ejecuta una vez al cargar el módulo (en desarrollo) para detectar
 * errores de configuración temprano, no en producción cuando el usuario
 * ya está en el fallback.
 *
 * @returns true si el número es válido, false en caso contrario
 */
export function validarNumeroComercial(): boolean {
  // Debe ser solo dígitos, entre 10 y 15 caracteres (código país + número)
  return /^\d{10,15}$/.test(NUMERO_WHATSAPP_COMERCIAL);
}

/**
 * Obtiene el número comercial (útil para tests y logging).
 *
 * @returns El número de WhatsApp comercial sin formato
 */
export function obtenerNumeroComercial(): string {
  return NUMERO_WHATSAPP_COMERCIAL;
}