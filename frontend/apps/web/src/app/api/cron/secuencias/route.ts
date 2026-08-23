// =============================================================================
// Cron: evaluar y enviar las secuencias activas
// =============================================================================
//
// Lo llama Cloudflare una vez al día. Hasta ahora las secuencias del CRM tenían
// disparador y nadie las disparaba: estaban escritas, con su plantilla lista, y
// no salían nunca.
//
// POR QUÉ NO ES UN HANDLER scheduled()
// ------------------------------------
// Con @opennextjs/cloudflare el `main` del Worker lo genera el build a partir
// de la aplicación de Next, y no hay un punto donde escribir un
// `export default { scheduled }`. El disparador cron apunta a esta ruta.
//
// QUIÉN PUEDE LLAMARLA
// --------------------
// Cualquiera que conozca la URL, si no se protege. Y esta ruta MANDA MENSAJES
// REALES: dejarla abierta significa que alguien puede vaciar el cupo de
// WhatsApp del negocio recargando una página.
//
// Se exige una cabecera con un secreto compartido. No es autenticación de
// usuario —no hay persona detrás de un cron— pero sí impide que la dispare
// quien no debe. Si el secreto no está configurado, la ruta se niega a
// funcionar en vez de quedarse abierta: fallar cerrado.

import { NextRequest, NextResponse } from 'next/server';
import { ejecutarSecuencias } from '@/lib/disparadores';
import { variableDeEntorno } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

export const dynamic = 'force-dynamic';

/** Cabecera donde viaja el secreto. */
const CABECERA = 'x-cron-secreto';

/**
 * Comparación en tiempo constante.
 *
 * Un `===` sobre cadenas se sale en el primer byte distinto, y con suficientes
 * intentos eso permite reconstruir el secreto midiendo cuánto tarda en
 * responder. Es la misma razón por la que se comparan así las firmas de Wompi.
 */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function autorizado(request: NextRequest): Promise<boolean> {
  const esperado = (await variableDeEntorno('CRON_SECRETO'))?.trim();

  // Sin secreto configurado NO se abre la puerta. Una automatización que manda
  // WhatsApp no puede quedar accesible por olvidar una variable.
  if (!esperado) return false;

  const recibido = request.headers.get(CABECERA)?.trim();
  return Boolean(recibido) && igual(recibido!, esperado);
}

export async function POST(request: NextRequest) {
  if (!(await autorizado(request))) {
    // 401 sin pistas: decir "falta el secreto" frente a "el secreto no coincide"
    // le confirma a quien sondea que la ruta existe y cómo se protege.
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const resultados = await ejecutarSecuencias();

    const enviados = resultados.reduce((n, r) => n + r.enviados, 0);
    const frenados = resultados.reduce((n, r) => n + r.frenadosPorTope, 0);
    const fallidos = resultados.reduce((n, r) => n + r.fallidos, 0);

    log.info('Cron de secuencias ejecutado', {
      ruta: '/api/cron/secuencias',
      detalle: [
        `${resultados.length} secuencias activas`,
        `${enviados} enviados`,
        `${frenados} frenados por el tope`,
        `${fallidos} fallidos`,
      ],
    });

    return NextResponse.json({ ok: true, enviados, frenados, fallidos, detalle: resultados });
  } catch (e) {
    log.error('El cron de secuencias falló entero', e, { ruta: '/api/cron/secuencias' });
    // 500 a propósito: Cloudflare lo marca como ejecución fallida y queda
    // visible en el panel. Devolver 200 con un error dentro haría que un cron
    // roto pareciera sano durante meses.
    return NextResponse.json({ ok: false, error: 'Fallo al ejecutar' }, { status: 500 });
  }
}

/**
 * GET para comprobar que la ruta responde sin mandar nada.
 *
 * Existe para poder verificar el despliegue y el secreto sin gastar
 * conversaciones de Meta: confundir "el cron no está configurado" con "el cron
 * no encuentra a nadie elegible" cuesta días de depuración.
 */
export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, listo: true, nota: 'Usa POST para ejecutar de verdad.' });
}
