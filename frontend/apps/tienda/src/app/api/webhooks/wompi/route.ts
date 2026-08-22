// =============================================================================
// Webhook de Wompi
// =============================================================================
//
// Es el UNICO aviso fiable de que el dinero entro. La redireccion del navegador
// tras pagar no sirve: la persona puede cerrar la pestana antes de volver, y el
// pedido se quedaria esperando para siempre aunque el cobro se hiciera.
//
// TRES REGLAS QUE MANDAN SOBRE EL CODIGO
// --------------------------------------
// 1. La FIRMA se verifica siempre y antes de nada. Sin eso, este endpoint es
//    publico y cualquiera manda un "APPROVED" inventado y se lleva comida
//    gratis. Es lo unico de todo el proyecto que, si falla, regala producto.
//
// 2. Se responde 200 aunque el evento se descarte. Wompi reintenta ante
//    cualquier cosa que no sea 2xx, asi que devolver 400 por un evento que no
//    nos interesa lo mete en un bucle de reintentos que no lleva a ningun sitio.
//    La excepcion es la firma invalida: ahi si conviene un 401, para que quede
//    claro en los dos lados que se rechazo.
//
// 3. El cuerpo se lee como TEXTO. La firma se calcula sobre valores extraidos
//    del JSON, pero leerlo dos veces (text + json) rompe el stream en Workers.
//    Se parsea una vez y se trabaja con el objeto.

import { NextRequest, NextResponse } from 'next/server';
import { aplicarEvento } from '@/lib/cobros';
import { configWompi, firmaEventoValida, type EventoWompi } from '@/lib/wompi';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const estado = await configWompi();

  if (!estado.listo) {
    // Sin secreto no se puede verificar nada, y aceptar sin verificar seria
    // peor que rechazar: se responde 503 para que Wompi reintente cuando este
    // configurado, en vez de dar el evento por procesado.
    console.error('Webhook de Wompi sin configurar:', estado.motivo);
    return new NextResponse('Sin configurar', { status: 503 });
  }

  let evento: EventoWompi;
  try {
    evento = (await request.json()) as EventoWompi;
  } catch {
    // Un cuerpo ilegible no se arregla reintentando.
    return NextResponse.json({ ok: true, nota: 'Cuerpo ilegible' }, { status: 200 });
  }

  // --- La firma, antes que nada ---
  const valida = await firmaEventoValida(evento, estado.config.secretoEventos);
  if (!valida) {
    console.warn('Evento de Wompi con firma invalida', {
      evento: evento?.event,
      referencia: evento?.data?.transaction?.reference,
    });
    return NextResponse.json({ ok: false, error: 'Firma invalida' }, { status: 401 });
  }

  // Solo interesan las actualizaciones de transaccion. Cualquier otro evento se
  // acepta y se ignora: Wompi puede anadir tipos nuevos y no queremos que eso
  // dispare reintentos.
  if (evento.event !== 'transaction.updated') {
    return NextResponse.json({ ok: true, nota: `Evento ignorado: ${evento.event}` });
  }

  try {
    const r = await aplicarEvento(evento);

    console.log('Evento de Wompi procesado', {
      referencia: evento.data.transaction?.reference,
      estado: r.estado,
      aplicado: r.aplicado,
      motivo: r.motivo,
    });

    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // Aqui SI conviene un 500: el evento era bueno y no se pudo aplicar, asi
    // que se quiere que Wompi reintente.
    console.error('Error aplicando evento de Wompi', e);
    return new NextResponse('Error interno', { status: 500 });
  }
}

/**
 * Wompi valida la URL con un GET al configurarla.
 *
 * Devolver 200 aqui es lo unico que hace falta para que el panel acepte la
 * direccion.
 */
export async function GET() {
  const estado = await configWompi();
  return NextResponse.json({
    ok: true,
    servicio: 'webhook de Wompi',
    configurado: estado.listo,
    entorno: estado.listo ? (estado.config.pruebas ? 'pruebas' : 'produccion') : null,
  });
}
