// =============================================================================
// Con qué acompañar lo que estás comiendo
// =============================================================================
//
// Es lo único de la IA que sube el ticket en el momento exacto: alguien con un
// cono en la mano, sentado en la mesa, con el móvil ya abierto en el QR. No hay
// mejor instante para sugerirle una bebida.
//
// SOLO EN MESA
// ------------
// A domicilio no se ofrece. Quien pide para casa ya tiene su nevera y la
// sugerencia no puede cumplirse: proponer una cerveza que no vendemos ni
// entregamos es ruido que resta credibilidad al resto.
//
// SI FALLA, NO PASA NADA
// ----------------------
// Devuelve null y la tarjeta no se pinta. Un error del proveedor de IA no puede
// impedir pedir: esto es un adorno que vende, no parte del camino de compra.
//
// POR QUÉ NO REUSA EL DEL CRM
// ---------------------------
// `apps/web/src/lib/ai/comensal.ts` tiene un maridaje parecido, pero vive en
// otro Worker y consultarlo obligaría a exponer un endpoint del CRM a la
// tienda, con su autenticación entre servicios. Para una llamada de un prompt
// no compensa: lo que se comparte de verdad —el criterio— está escrito abajo.

import { variableDeEntorno } from '@/lib/cloudflare';

export interface Maridaje {
  bebida: string;
  porQue: string;
  /** Otra opción, para quien no beba alcohol o no le guste la primera. */
  alternativa: string;
}

const INSTRUCCIONES = `Eres el maestro de sala de Bocazo, una marca colombiana de conos gourmet.
Alguien está comiendo AHORA MISMO en la mesa y quiere saber con qué acompañarlo.

Reglas:
- Español de Colombia, cercano, sin pomposidad. Nada de lenguaje de carta de vinos.
- La razón, en UNA frase corta y apetecible. Se lee en el móvil, en cinco segundos.
- Sugiere bebidas normales en un bar colombiano: cervezas, gaseosas, limonadas, cocteles sencillos,
  jugos naturales. Nada exótico ni difícil de conseguir.
- La ALTERNATIVA debe ser SIN ALCOHOL siempre. Puede estar conduciendo, ser menor o no beber, y
  dejarle sin opción es perder la venta entera.
- No inventes productos de la marca ni precios.

Responde SOLO con JSON, sin texto alrededor:
{"bebida":"nombre concreto","porQue":"una frase","alternativa":"opción sin alcohol"}`;

/** Modelo pequeño y rápido: esto se lee en cinco segundos o no se lee. */
const MODELO = 'llama-3.1-8b-instant';

/**
 * Sugiere una bebida para el producto que se está consumiendo.
 *
 * `paladar` es el perfil del cuestionario, si lo respondió. Dos personas con el
 * mismo plato y distinto perfil merecen sugerencias distintas, y esa diferencia
 * es lo que hace que la tarjeta no parezca un anuncio genérico.
 */
export async function maridajePara(datos: {
  producto: string;
  descripcion?: string | null;
  paladar?: Record<string, string>;
}): Promise<Maridaje | null> {
  const clave = (await variableDeEntorno('GROQ_API_KEY'))?.trim();
  if (!clave) return null;

  const perfil = datos.paladar && Object.keys(datos.paladar).length > 0
    ? `Su perfil de paladar: ${Object.entries(datos.paladar).map(([k, v]) => `${k}=${v}`).join(', ')}.`
    : 'No conocemos su perfil de paladar.';

  const peticion = [
    `Está comiendo: ${datos.producto}.`,
    datos.descripcion ? `Descripción: ${datos.descripcion}` : '',
    perfil,
  ].filter(Boolean).join('\n');

  try {
    const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${clave}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: 'system', content: INSTRUCCIONES },
          { role: 'user', content: peticion },
        ],
        // Se le pide JSON de verdad al proveedor en vez de confiar en que
        // obedezca el prompt: sin esto, uno de cada varias respuestas llega
        // envuelta en explicaciones y el parseo falla de forma intermitente,
        // que es la peor manera de fallar.
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!respuesta.ok) return null;

    const cuerpo = (await respuesta.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const texto = cuerpo.choices?.[0]?.message?.content;
    if (!texto) return null;

    const salida = JSON.parse(texto) as Partial<Maridaje>;

    // Se exigen los tres campos: media sugerencia —una bebida sin razón, o sin
    // alternativa sin alcohol— es peor que ninguna.
    if (!salida.bebida?.trim() || !salida.porQue?.trim() || !salida.alternativa?.trim()) {
      return null;
    }

    return {
      bebida: salida.bebida.trim().slice(0, 80),
      porQue: salida.porQue.trim().slice(0, 200),
      alternativa: salida.alternativa.trim().slice(0, 80),
    };
  } catch {
    // Ver la cabecera: si falla, la tarjeta no se pinta y ya.
    return null;
  }
}
