// =============================================================================
// Cron: pedir la opinión a tiempo, y clasificar lo que llega
// =============================================================================
//
// Corre cada pocos minutos y hace dos cosas que no pueden esperar al día
// siguiente:
//
//   1. PREGUNTAR. A quien recibió su pedido hace un rato —el suficiente para
//      haber comido— se le pide que cuente qué tal estuvo. Antes esto se pedía
//      en la pantalla de entrega, cuando la persona todavía tenía la bolsa
//      cerrada, y lo que se obtenía eran notas sobre el reparto.
//
//   2. CLASIFICAR. Las reseñas que entraron se meten en una de cuatro cajas:
//      fallo de cocina, fallo de reparto, preferencia o elogio. Sin esto, el
//      panel enseñaba "sin analizar" en todas — que es lo que pasaba, porque el
//      clasificador existía y nadie lo llamaba.
//
// POR QUÉ NO VA EN EL CRON DIARIO
// -------------------------------
// Preguntar al día siguiente por una cena da respuestas vagas, y una alerta de
// calidad que aparece veinte horas después del problema llega cuando ya no se
// puede reponer nada. Esto necesita minutos, no horas.
//
// MISMA PROTECCIÓN QUE EL OTRO CRON
// ---------------------------------
// Manda mensajes reales, así que se exige el mismo secreto compartido. Si no
// está configurado, la ruta se niega a funcionar en vez de quedarse abierta.

import { NextRequest, NextResponse } from 'next/server';
import { clasificarPendientes, marcarResenaPedida, pedidosPorPreguntar } from '@/lib/resenas';
import { enviarPush } from '@/lib/push';
import { ventanaAbierta } from '@/lib/canal';
import { sendTextMessage } from '@/lib/whatsapp/service';
import { registrarEnvio } from '@/lib/whatsapp/despacho';
import { variableDeEntorno } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

export const dynamic = 'force-dynamic';

const CABECERA = 'x-cron-secreto';

/** Comparación en tiempo constante, igual que en el cron de secuencias. */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function autorizado(request: NextRequest): Promise<boolean> {
  const esperado = (await variableDeEntorno('CRON_SECRETO'))?.trim();
  if (!esperado) return false;
  const recibido = request.headers.get(CABECERA)?.trim();
  return Boolean(recibido) && igual(recibido!, esperado);
}

/** El texto que se le manda. Corto: se lee en una notificación. */
function mensaje(codigo: string): string {
  return `¿Qué tal estuvo tu pedido ${codigo}? Cuéntanoslo en dos toques y sumas puntos.`;
}

export async function POST(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const urlTienda =
    (await variableDeEntorno('URL_TIENDA'))?.replace(/\/+$/, '') ??
    'https://bocazo-tienda.camiloriverac0.workers.dev';

  let preguntados = 0;
  let sinCanal = 0;

  try {
    for (const pedido of await pedidosPorPreguntar()) {
      let llego = false;

      /*
        Mismo orden que el resto del sistema: ventana abierta -> WhatsApp; si no,
        notificación. Y aquí importa especialmente que haya dos vías, porque
        quien pide por la tienda casi nunca ha escrito por WhatsApp.
      */
      if (pedido.consumerId && (await ventanaAbierta(pedido.consumerId).catch(() => false))) {
        const texto = `${mensaje(pedido.codigo)}\n${urlTienda}/pedido/${pedido.codigo}`;
        const r = await sendTextMessage({ to: pedido.telefono, text: texto });
        await registrarEnvio({
          telefono: pedido.telefono,
          resultado: r,
          texto,
          enviadoPor: null,
        }).catch(() => {});
        llego = r.ok;
      }

      if (!llego && pedido.consumerId) {
        const r = await enviarPush(pedido.consumerId, {
          titulo: '¿Qué tal estuvo?',
          cuerpo: mensaje(pedido.codigo),
          // Lleva directo a su pedido, donde ya se pueden pulsar las estrellas.
          url: `/pedido/${pedido.codigo}`,
          etiqueta: `resena-${pedido.codigo}`,
        });
        llego = r.entregados > 0;
      }

      /*
        Se marca como pedida AUNQUE NO HAYA LLEGADO.

        Si no, el cron lo reintentaría cada pocos minutos para siempre con quien
        no tiene ningún canal — cientos de intentos inútiles y, en el caso de
        WhatsApp, errores repetidos que perjudican la calificación del número.

        Una oportunidad por pedido. Quien vuelva a abrir el enlace encuentra las
        estrellas igualmente.
      */
      await marcarResenaPedida(pedido.id);

      if (llego) preguntados++;
      else sinCanal++;
    }

    const clasificacion = await clasificarPendientes();

    log.info('Cron de reseñas ejecutado', {
      ruta: '/api/cron/resenas',
      detalle: [
        `${preguntados} preguntados`,
        `${sinCanal} sin canal`,
        `${clasificacion.clasificadas} clasificadas de ${clasificacion.revisadas}`,
      ],
    });

    return NextResponse.json({ ok: true, preguntados, sinCanal, ...clasificacion });
  } catch (e) {
    log.error('El cron de reseñas falló', e, { ruta: '/api/cron/resenas' });
    return NextResponse.json({ ok: false, error: 'Error al procesar' }, { status: 500 });
  }
}
