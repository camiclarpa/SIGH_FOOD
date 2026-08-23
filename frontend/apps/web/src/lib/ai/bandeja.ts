// =============================================================================
// Borrador de respuesta para la bandeja
// =============================================================================
//
// De todo lo que puede hacer la IA en este CRM, esto es lo único que produce
// valor desde el primer cliente, y conviene entender por qué.
//
// Las funciones de PREDICCIÓN —riesgo de abandono, puntuación de intención,
// recomendación colaborativa— valen según cuántos datos haya. Con veinte
// pedidos no predicen: adivinan con buena presentación.
//
// Un borrador de respuesta vale según cuánto TIEMPO ahorra, y eso no depende
// del volumen. Funciona con el primer mensaje que entre. Y en comida por
// WhatsApp la velocidad de respuesta es lo que cierra: contestar en dos minutos
// en vez de en veinte cambia la venta.
//
// NO ENVÍA NADA
// -------------
// Devuelve texto para que una persona lo lea, lo corrija y decida. Un agente
// que contesta solo a un cliente que pregunta por su pedido puede inventarse un
// tiempo de entrega, y quien paga el error es el negocio. La revisión humana no
// es una limitación temporal: es el diseño.

import { and, desc, eq } from 'drizzle-orm';
import {
  b2cConsumers,
  chatConversations,
  chatMessages,
  pedidos,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { chatWithAIConRespaldo } from '@/lib/ai/services/ai-router';
import { etiquetaNivel } from '@/lib/catalogo-b2c';

/** Cuántos mensajes del hilo se le pasan al modelo. */
const MENSAJES_DE_CONTEXTO = 8;

const INSTRUCCIONES = `Eres quien atiende el WhatsApp de Bocazo, una marca colombiana de conos
gourmet. Escribes el borrador de una respuesta que una persona del equipo va a revisar antes de
enviar.

Reglas:
- Español de Colombia, tuteo, cercano pero no forzado. Nada de "estimado cliente".
- Máximo tres frases. Esto se lee en un móvil.
- Si te falta un dato para responder (un tiempo exacto, un precio que no aparece en el contexto),
  NO te lo inventes: escribe la respuesta dejando ese hueco entre corchetes, por ejemplo
  [confirmar hora]. Es preferible que la persona rellene un hueco a que el cliente reciba un dato
  falso.
- No prometas nada que no esté en el contexto que te dan.
- Si el mensaje es una queja, reconoce el problema en la primera frase antes de resolver.
- Sin emojis salvo que el cliente los use primero.
- Responde SOLO con el texto del mensaje. Sin comillas, sin explicaciones, sin firmar.`;

export interface Borrador {
  texto: string;
  /** Qué proveedor respondió. Un respaldo silencioso esconde que el principal está caído. */
  proveedor: string;
  /** Lo que se le pasó al modelo, para poder explicar de dónde salió la respuesta. */
  contexto: string[];
}

/**
 * Redacta un borrador para el último mensaje del cliente.
 *
 * El contexto que se arma aquí es lo que separa un borrador útil de una
 * respuesta genérica: el modelo ve quién escribe, qué nivel tiene, cuántos
 * puntos lleva y en qué estado está su último pedido. Sin eso contestaría como
 * un formulario.
 */
export async function borradorDeRespuesta(conversationId: string): Promise<Borrador> {
  const datos = await conBaseDeDatos(async (db) => {
    const [conversacion] = await db
      .select({
        id: chatConversations.id,
        telefono: chatConversations.telefono,
        consumerId: chatConversations.consumerId,
      })
      .from(chatConversations)
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conversacion) return null;

    // Los últimos mensajes, más recientes primero para poder cortar, y se
    // invierten después: el modelo necesita leerlos en orden cronológico.
    const historial = await db
      .select({
        direccion: chatMessages.direccion,
        texto: chatMessages.texto,
        creado: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(MENSAJES_DE_CONTEXTO);

    const comensal = conversacion.consumerId
      ? (
          await db
            .select({
              nombre: b2cConsumers.fullName,
              puntos: b2cConsumers.points,
              nivel: b2cConsumers.membershipTier,
            })
            .from(b2cConsumers)
            .where(eq(b2cConsumers.id, conversacion.consumerId))
            .limit(1)
        )[0]
      : null;

    // El último pedido es casi siempre de lo que van a preguntar.
    const ultimoPedido = conversacion.consumerId
      ? (
          await db
            .select({
              codigo: pedidos.codigo,
              estado: pedidos.estado,
              estadoPago: pedidos.estadoPago,
              total: pedidos.totalCOP,
              tipoEntrega: pedidos.tipoEntrega,
              creado: pedidos.createdAt,
            })
            .from(pedidos)
            .where(eq(pedidos.consumerId, conversacion.consumerId))
            .orderBy(desc(pedidos.createdAt))
            .limit(1)
        )[0]
      : null;

    return { conversacion, historial: historial.reverse(), comensal, ultimoPedido };
  });

  if (!datos) throw new Error('La conversación no existe');

  const entrantes = datos.historial.filter((m) => m.direccion === 'entrante');
  if (entrantes.length === 0) {
    throw new Error('Este hilo no tiene ningún mensaje del cliente al que responder');
  }

  // --- Contexto, en líneas legibles ---
  //
  // Se arma como texto y no como JSON a propósito: además de ir al modelo, se
  // le enseña a quien pulsa el botón, para que pueda ver con qué información se
  // redactó y detectar si algo está desactualizado.
  const contexto: string[] = [];

  if (datos.comensal) {
    contexto.push(
      `Cliente: ${datos.comensal.nombre ?? 'sin nombre'} · ` +
        `nivel ${etiquetaNivel(datos.comensal.nivel)} · ${datos.comensal.puntos ?? 0} puntos`
    );
  } else {
    contexto.push('Cliente: no está registrado como comensal todavía');
  }

  if (datos.ultimoPedido) {
    const dias = Math.floor(
      (Date.now() - new Date(datos.ultimoPedido.creado ?? Date.now()).getTime()) / 86_400_000
    );
    contexto.push(
      `Último pedido: ${datos.ultimoPedido.codigo} · ${datos.ultimoPedido.estado} · ` +
        `pago ${datos.ultimoPedido.estadoPago} · $${datos.ultimoPedido.total.toLocaleString('es-CO')} · ` +
        `${datos.ultimoPedido.tipoEntrega} · hace ${dias} día${dias === 1 ? '' : 's'}`
    );
  } else {
    contexto.push('Último pedido: ninguno');
  }

  const conversacionTexto = datos.historial
    .map((m) => `${m.direccion === 'entrante' ? 'Cliente' : 'Nosotros'}: ${m.texto ?? '(sin texto)'}`)
    .join('\n');

  const peticion = [
    contexto.join('\n'),
    '',
    'Conversación:',
    conversacionTexto,
    '',
    'Escribe la respuesta al último mensaje del cliente.',
  ].join('\n');

  const { texto, proveedorUsado } = await chatWithAIConRespaldo(INSTRUCCIONES, peticion);

  return {
    // Los modelos devuelven a veces la frase entre comillas pese a pedirlo; se
    // quitan aquí para que no haya que borrarlas a mano cada vez.
    texto: texto.trim().replace(/^["“](.*)["”]$/s, '$1').trim(),
    proveedor: proveedorUsado,
    contexto,
  };
}
