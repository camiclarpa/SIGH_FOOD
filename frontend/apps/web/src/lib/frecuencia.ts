// =============================================================================
// Cuántas veces se le puede escribir a alguien
// =============================================================================
//
// Esto no es cortesía: es lo que protege el número de WhatsApp.
//
// Meta mide la calidad de un remitente por cómo reacciona la gente. Bloqueos y
// "reportar" bajan la calificación del número, y una calificación baja recorta
// el límite diario de conversaciones o suspende el envío. No hay aviso previo
// útil: el día que pasa, la bandeja sigue recibiendo pero deja de poder
// escribir, y recuperar la calificación tarda semanas.
//
// Hasta ahora nada impedía que tres secuencias distintas —bienvenida,
// reactivación y una campaña— cayeran sobre el mismo comensal el mismo día.
// Cada una miraba su propia lógica y ninguna miraba a la persona.
//
// DÓNDE VA EL TOPE
// ----------------
// En enviarPlantilla(), que es el único punto por el que sale un mensaje
// comercial. Ponerlo en cada llamador dejaría la puerta abierta al siguiente
// que se escriba.
//
// QUÉ NO CUENTA
// -------------
// Las respuestas de la bandeja. Si alguien escribe preguntando por su pedido,
// contestarle no es marketing y no puede quedar bloqueado porque esta semana ya
// recibió una promoción — sería el peor momento posible para callarse. El tope
// cuenta solo lo que sale por una secuencia.

import { and, count, eq, gte, isNotNull } from 'drizzle-orm';
import { automationLogs } from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';

/**
 * Impactos comerciales por comensal en la ventana.
 *
 * Tres a la semana es un punto de partida deliberadamente conservador para una
 * marca de comida: el valor del mensaje decae rápido y la molestia se acumula.
 * Se sube con datos —tasa de respuesta, bloqueos—, no por intuición.
 */
export const MAXIMO_POR_VENTANA = 3;

/** Ventana móvil, en días. Móvil y no semana natural: ver comentario en ventanaDesde(). */
export const DIAS_DE_VENTANA = 7;

/**
 * Inicio de la ventana móvil.
 *
 * Móvil y no "semana natural" a propósito: con semanas naturales se pueden
 * mandar tres el domingo por la noche y tres el lunes por la mañana sin superar
 * ningún tope, y quien lo recibe ha tenido seis mensajes en doce horas. La
 * ventana móvil es la que se corresponde con lo que siente la persona.
 */
export function ventanaDesde(ahora = new Date()): Date {
  return new Date(ahora.getTime() - DIAS_DE_VENTANA * 24 * 60 * 60 * 1000);
}

export interface EstadoFrecuencia {
  /** Cuántos impactos comerciales lleva en la ventana. */
  enviados: number;
  restantes: number;
  /** true si se le puede escribir una vez más. */
  puede: boolean;
}

/**
 * Cuántos mensajes comerciales ha recibido este comensal en la ventana.
 *
 * Solo cuenta los que SALIERON. Un envío fallido no lo recibió nadie y no debe
 * consumir cupo: si Meta rechaza uno por plantilla mal formada, castigar por
 * ello al comensal significaría dejarlo incomunicado por un error nuestro.
 */
export async function frecuenciaDe(
  db: Database,
  consumerId: string,
  ahora = new Date()
): Promise<EstadoFrecuencia> {
  const [fila] = await db
    .select({ total: count(automationLogs.id) })
    .from(automationLogs)
    .where(
      and(
        eq(automationLogs.consumerId, consumerId),
        eq(automationLogs.status, 'sent'),
        isNotNull(automationLogs.sentAt),
        gte(automationLogs.sentAt, ventanaDesde(ahora))
      )
    );

  const enviados = Number(fila?.total ?? 0);
  return {
    enviados,
    restantes: Math.max(0, MAXIMO_POR_VENTANA - enviados),
    puede: enviados < MAXIMO_POR_VENTANA,
  };
}

/**
 * Mensaje para quien intenta enviar por encima del tope.
 *
 * Explica el porqué, no solo el qué: quien lo lee está a punto de pensar que el
 * CRM está roto, y necesita entender que el bloqueo lo protege a él.
 */
export function motivoDelTope(estado: EstadoFrecuencia): string {
  return (
    `Este comensal ya recibió ${estado.enviados} mensaje${estado.enviados === 1 ? '' : 's'} ` +
    `en los últimos ${DIAS_DE_VENTANA} días, que es el máximo. ` +
    'Insistir sube los bloqueos y con ellos el riesgo de que Meta limite el número. ' +
    'Si es urgente y la persona escribió en las últimas 24 h, respóndele desde la Bandeja: ' +
    'eso no consume cupo.'
  );
}
