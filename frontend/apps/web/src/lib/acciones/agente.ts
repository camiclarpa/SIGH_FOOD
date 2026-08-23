'use server';

// =============================================================================
// Acciones del agente: supervisión humana y calibración
// =============================================================================
//
// Aquí es donde una persona decide qué hace el agente. Sin esta capa, el agente
// tiene dos modos posibles: no actuar nunca, o actuar sin que nadie lo mire.

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { approvalRequests, configuracion } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import { UMBRALES, type ClaveUmbral } from '@/lib/umbrales';
import { borradorDeRespuesta } from '@/lib/ai/bandeja';

export interface Resultado<T = undefined> {
  ok: boolean;
  error?: string;
  datos?: T;
}

async function ejecutar<T>(nombre: string, trabajo: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await trabajo() };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message };
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/agente' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Supervisión humana de las solicitudes del agente
// -----------------------------------------------------------------------------

/**
 * Aprueba una solicitud del agente.
 *
 * La condición de estado va en el WHERE: dos revisores mirando la misma cola
 * podrían aprobar lo mismo a la vez, y la acción se ejecutaría dos veces.
 */
export async function aprobarSolicitud(datos: {
  id: string;
  nota?: string;
}): Promise<Resultado> {
  return ejecutar('aprobarSolicitud', async () => {
    const actor = await exigir('agente.aprobar');

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .update(approvalRequests)
        .set({
          status: 'approved',
          approvedBy: actor.id || null,
          approvedAt: new Date(),
          // La nota va en rejectedReason porque es el único campo de texto que
          // hay. No es bonito, pero perder el motivo de una aprobación sería
          // peor que reutilizar una columna mal nombrada.
          rejectedReason: datos.nota?.trim() || null,
        })
        .where(and(eq(approvalRequests.id, datos.id), eq(approvalRequests.status, 'pending')))
        .returning({ id: approvalRequests.id, accion: approvalRequests.actionType });

      if (!fila) throw new Error('Esa solicitud ya no está pendiente');

      log.info('Solicitud del agente aprobada', {
        ruta: '/acciones/agente',
        detalle: [actor.email, fila.accion ?? datos.id],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/agente');
    return r;
  });
}

export async function rechazarSolicitud(datos: {
  id: string;
  motivo: string;
}): Promise<Resultado> {
  return ejecutar('rechazarSolicitud', async () => {
    const actor = await exigir('agente.aprobar');
    // El motivo es obligatorio: es lo que el agente puede aprender de un
    // rechazo. Sin él, solo sabe que no, no por qué.
    if (!datos.motivo.trim()) throw new Error('Indica por qué se rechaza');

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .update(approvalRequests)
        .set({
          status: 'rejected',
          rejectedReason: datos.motivo.trim(),
          approvedBy: actor.id || null,
          approvedAt: new Date(),
        })
        .where(and(eq(approvalRequests.id, datos.id), eq(approvalRequests.status, 'pending')))
        .returning({ id: approvalRequests.id });

      if (!fila) throw new Error('Esa solicitud ya no está pendiente');

      log.info('Solicitud del agente rechazada', {
        ruta: '/acciones/agente',
        detalle: [actor.email, datos.motivo.trim()],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/agente');
    return r;
  });
}

/**
 * Aprueba con cambios.
 *
 * Es el caso más común en la práctica: la propuesta del agente es razonable
 * pero el descuento es excesivo, o el mensaje dice algo que la marca no diría.
 * Sin esta opción, la única salida sería rechazar y rehacerlo a mano.
 */
export async function modificarSolicitud(datos: {
  id: string;
  cambios: Record<string, unknown>;
  nota: string;
}): Promise<Resultado> {
  return ejecutar('modificarSolicitud', async () => {
    const actor = await exigir('agente.aprobar');
    if (!datos.nota.trim()) throw new Error('Explica qué has cambiado');

    return conBaseDeDatos(async (db) => {
      const [actual] = await db
        .select({ datos: approvalRequests.approvalData, estado: approvalRequests.status })
        .from(approvalRequests)
        .where(eq(approvalRequests.id, datos.id))
        .limit(1);

      if (!actual) throw new Error('La solicitud no existe');
      if (actual.estado !== 'pending') throw new Error('Esa solicitud ya no está pendiente');

      const original = (actual.datos ?? {}) as Record<string, unknown>;

      const [fila] = await db
        .update(approvalRequests)
        .set({
          status: 'approved',
          approvedBy: actor.id || null,
          approvedAt: new Date(),
          rejectedReason: `Modificado: ${datos.nota.trim()}`,
          // Se guarda la propuesta original junto a la modificada. Es el dato
          // con el que el agente puede aprender qué corrige siempre un humano.
          approvalData: {
            ...original,
            ...datos.cambios,
            _propuestaOriginal: original,
            _modificadoPor: actor.email,
          },
        })
        .where(and(eq(approvalRequests.id, datos.id), eq(approvalRequests.status, 'pending')))
        .returning({ id: approvalRequests.id });

      if (!fila) throw new Error('Otro revisor acaba de resolverla');

      log.info('Solicitud del agente aprobada con cambios', {
        ruta: '/acciones/agente',
        detalle: [actor.email, datos.nota.trim()],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/agente');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Calibración de umbrales
// -----------------------------------------------------------------------------

export async function guardarUmbral(datos: {
  clave: ClaveUmbral;
  valor: number;
}): Promise<Resultado> {
  return ejecutar('guardarUmbral', async () => {
    const actor = await exigir('agente.calibrar');

    const definicion = UMBRALES.find((u) => u.clave === datos.clave);
    if (!definicion) throw new Error('Ese umbral no existe');

    // Los límites se validan en el servidor y no solo en el slider: la Server
    // Action es invocable directamente, y un umbral de 0 días marcaría a todos
    // los comensales como en riesgo.
    if (datos.valor < definicion.min || datos.valor > definicion.max) {
      throw new Error(`${definicion.etiqueta} debe estar entre ${definicion.min} y ${definicion.max}`);
    }

    return conBaseDeDatos(async (db) => {
      await db
        .insert(configuracion)
        .values({
          clave: datos.clave,
          valor: datos.valor,
          descripcion: definicion.descripcion,
          actualizadoPor: actor.id || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: configuracion.clave,
          set: {
            valor: datos.valor,
            actualizadoPor: actor.id || null,
            updatedAt: new Date(),
          },
        });

      log.info('Umbral calibrado', {
        ruta: '/acciones/agente',
        detalle: [actor.email, datos.clave, String(datos.valor)],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) {
      // Los umbrales afectan a varias pantallas: comensales en riesgo, los
      // segmentos que dependen de la inactividad y el propio panel.
      revalidatePath('/agente');
      revalidatePath('/comensales');
      revalidatePath('/segmentos');
      revalidatePath('/panel');
    }
    return r;
  });
}

/** Devuelve un umbral al valor con el que se diseñó. */
export async function restablecerUmbral(clave: ClaveUmbral): Promise<Resultado> {
  return ejecutar('restablecerUmbral', async () => {
    const actor = await exigir('agente.calibrar');
    const definicion = UMBRALES.find((u) => u.clave === clave);
    if (!definicion) throw new Error('Ese umbral no existe');

    await conBaseDeDatos((db) =>
      db.delete(configuracion).where(eq(configuracion.clave, clave))
    );

    log.info('Umbral restablecido', { ruta: '/acciones/agente', detalle: [actor.email, clave] });
    return undefined;
  }).then((r) => {
    if (r.ok) { revalidatePath('/agente'); revalidatePath('/comensales'); }
    return r;
  });
}

// -----------------------------------------------------------------------------
// Sandbox
// -----------------------------------------------------------------------------

/**
 * Simula cómo reaccionaría el agente ante un comensal inventado.
 *
 * Nada de lo que ocurre aquí se guarda: es el punto de todo el módulo. Probar
 * un cambio de prompt sobre comensales reales significa que el primer intento
 * fallido ya salió por WhatsApp.
 */
export async function simularAgente(datos: {
  escenario: string;
  perfil: {
    nombre: string;
    momentos: number;
    diasSinVenir: number;
    lineaFavorita: string;
    puntos: number;
  };
}): Promise<Resultado<{ respuesta: unknown; prompt: string }>> {
  return ejecutar('simularAgente', async () => {
    await exigir('agente.sandbox');

    const { parseAIJsonResponse } = await import('@/lib/ai/services/ai-router');

    const sistema = `Eres el agente de retención de SIGH_FOOD, una marca de salsas para hostelería.
Analiza al comensal y decide qué hacer.

Responde SOLO en JSON:
{"decision":"contactar|esperar|no_actuar","riesgo":0.0 a 1.0,
 "accion":"qué harías, concreto","mensaje":"texto listo para enviar, máximo 200 caracteres",
 "porQue":"tu razonamiento en una frase"}`;

    const usuario = JSON.stringify({ escenario: datos.escenario, comensal: datos.perfil });

    const respuesta = await parseAIJsonResponse<Record<string, unknown>>(sistema, usuario);

    // Se devuelve también el prompt: media hora de "el agente responde raro" se
    // resuelve viendo exactamente qué se le mandó.
    return { respuesta, prompt: `${sistema}\n\n---\n\n${usuario}` };
  });
}

// -----------------------------------------------------------------------------
// Asistencia real: borrador de respuesta para la bandeja
// -----------------------------------------------------------------------------

/**
 * Redacta un borrador de respuesta para un hilo de WhatsApp.
 *
 * Es lo único de todo el módulo de IA que produce valor desde el primer
 * cliente: las funciones de predicción necesitan volumen que todavía no existe,
 * y un borrador ahorra tiempo con el primer mensaje que entre.
 *
 * NO ENVÍA. Devuelve texto para que una persona lo lea, lo corrija y decida. Un
 * agente que conteste solo puede inventarse un tiempo de entrega, y quien paga
 * ese error es el negocio.
 *
 * Exige el mismo permiso que responder: quien no puede escribir en la bandeja
 * tampoco necesita que se le redacte nada, y sin esta comprobación cualquiera
 * con sesión podría gastar la cuota del proveedor de IA.
 */
export async function sugerirRespuesta(
  conversationId: string
): Promise<Resultado<{ texto: string; proveedor: string; contexto: string[] }>> {
  return ejecutar('sugerirRespuesta', async () => {
    const actor = await exigir('campanas.probar');

    const borrador = await borradorDeRespuesta(conversationId);

    log.info('Borrador de respuesta generado', {
      ruta: '/acciones/agente',
      detalle: [actor.email, conversationId, borrador.proveedor],
    });

    return borrador;
  });
}
