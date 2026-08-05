/**
 * Genera un enlace de WhatsApp pre-llenado para fallback de leads
 * @param data Datos del lead
 * @param phoneNumber Número de WhatsApp del equipo de ventas de SIGH_FOOD (formato internacional sin +)
 * @returns URL codificada lista para usar en un enlace <a>
 */
export function generateWhatsAppFallbackLink(
  data: {
    establishmentName: string;
    decisionMaker: string;
    phone: string;
    topLiquors: string;
    estimatedWeeklyVolume: number;
  },
  phoneNumber: string = "573001234567" // Reemplazar con el número real de ventas
): string {
  const message = `Hola SIGH_FOOD, tuve un problema enviando el formulario web. Aquí están mis datos para agendar la cata piloto:

📍 *Establecimiento:* ${data.establishmentName}
👤 *Decisor:* ${data.decisionMaker}
📞 *Mi teléfono:* ${data.phone}
🍹 *Licores top:* ${data.topLiquors}
📊 *Volumen semanal est.:* ${data.estimatedWeeklyVolume} tragos

Quedo atento a su respuesta.`;

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}