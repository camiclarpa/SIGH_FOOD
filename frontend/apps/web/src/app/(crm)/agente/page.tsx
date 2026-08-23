import Link from 'next/link';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { chatConversations, consumerReviews } from '@sighfood/domain/db/schema';
import { conBaseDeDatos, variableDeEntorno } from '@/lib/cloudflare';
import { Etiqueta, Metrica, Tarjeta, Titulo, Vacio, numero } from '@/components/ui';

export const metadata = { title: 'Agente IA · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/*
  ============================================================================
  Agente IA — lo que produce
  ============================================================================

  Esta pantalla enseñaba el estado interno de catorce arquitecturas: episodios
  aprendidos, patrones consolidados, nodos del grafo de conocimiento. Todas sus
  tablas están vacías, ninguna se invoca desde ninguna pantalla y no hay ningún
  proceso que las ejecute. Era un tablero que vigilaba una máquina que nadie
  enciende, ocupando la sección más visible del CRM.

  El código NO se ha borrado: sigue entero, con sus endpoints, y su tablero vive
  ahora en /agente/diagnostico. El día que haya volumen para que esas funciones
  signifiquen algo, están.

  Lo que queda aquí es lo que ayuda a vender hoy. Y hay una razón por la que son
  estas tres y no las otras catorce:

    · Las funciones de PREDICCIÓN valen según cuántos datos haya. Con veinte
      pedidos no predicen, adivinan con buena presentación.

    · Las de REDACCIÓN valen según cuánto tiempo ahorran, y eso no depende del
      volumen. Funcionan con el primer cliente que escriba.

  Con un negocio que arranca, solo las segundas producen algo.
*/

/** Días hacia atrás para las cifras de uso. */
const VENTANA_DIAS = 30;

async function cargar() {
  const desde = new Date(Date.now() - VENTANA_DIAS * 24 * 3_600_000);

  const [clave, datos] = await Promise.all([
    // Sin proveedor configurado nada de esto funciona, y conviene decirlo aquí
    // en vez de que se descubra al pulsar el botón.
    variableDeEntorno('GROQ_API_KEY'),
    conBaseDeDatos(async (db) => {
      const [abiertas, hilos, resenas, alertas, ultimas] = await Promise.all([
        // Conversaciones con la ventana de 24 h todavía abierta: son las que
        // se pueden responder con texto libre, o sea donde sirve el borrador.
        db
          .select({ total: count(chatConversations.id) })
          .from(chatConversations)
          .where(gte(chatConversations.ventanaExpiraEn, new Date())),

        db
          .select({ total: count(chatConversations.id) })
          .from(chatConversations),

        db
          .select({ total: count(consumerReviews.id) })
          .from(consumerReviews)
          .where(gte(consumerReviews.createdAt, desde)),

        db
          .select({ total: count(consumerReviews.id) })
          .from(consumerReviews)
          .where(and(gte(consumerReviews.createdAt, desde), eq(consumerReviews.alertaCalidad, true))),

        db
          .select({
            id: chatConversations.id,
            telefono: chatConversations.telefono,
            ultimo: chatConversations.ultimoMensajeEn,
          })
          .from(chatConversations)
          .where(gte(chatConversations.ventanaExpiraEn, new Date()))
          .orderBy(desc(chatConversations.ultimoMensajeEn))
          .limit(5),
      ]);

      return {
        abiertas: abiertas[0]?.total ?? 0,
        hilos: hilos[0]?.total ?? 0,
        resenas: resenas[0]?.total ?? 0,
        alertas: alertas[0]?.total ?? 0,
        ultimas,
      };
    }),
  ]);

  return { configurado: Boolean(clave?.trim()), ...datos };
}

export default async function PaginaAgente() {
  const d = await cargar();

  return (
    <>
      <Titulo>Agente IA</Titulo>

      <p className="texto-suave mb-4 max-w-3xl text-sm">
        Lo que la IA hace hoy por el negocio. El estado interno de las catorce arquitecturas
        está en{' '}
        <Link href="/agente/diagnostico" className="text-orange-600 hover:underline dark:text-orange-400">
          Diagnóstico
        </Link>
        : son endpoints que responden si se les llama, pero nada del producto los usa todavía.
      </p>

      {!d.configurado && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200"
        >
          <strong className="font-semibold">Sin proveedor de IA configurado.</strong>{' '}
          Falta <code className="cifras">GROQ_API_KEY</code> como secreto del Worker. Hasta que
          esté, el botón de sugerir respuesta va a fallar al pulsarlo. Se sube con{' '}
          <code className="cifras">node scripts/configurar-ia.mjs</code>.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Conversaciones abiertas"
          valor={numero(d.abiertas)}
          detalle="con ventana de 24 h · donde sirve el borrador"
          tono={d.abiertas > 0 ? 'marca' : 'neutro'}
        />
        <Metrica etiqueta="Hilos en total" valor={numero(d.hilos)} detalle="histórico de la bandeja" />
        <Metrica
          etiqueta={`Reseñas (${VENTANA_DIAS} días)`}
          valor={numero(d.resenas)}
          detalle="analizadas al llegar"
        />
        <Metrica
          etiqueta="Alertas de calidad"
          valor={numero(d.alertas)}
          detalle="fallos de producción detectados"
          tono={d.alertas > 0 ? 'riesgo' : 'exito'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Tarjeta>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="font-semibold">Borrador de respuesta</h2>
            <Etiqueta tono={d.configurado ? 'exito' : 'aviso'}>
              {d.configurado ? 'listo' : 'sin llave'}
            </Etiqueta>
          </div>
          <p className="texto-suave text-sm">
            En cada conversación de la Bandeja hay un botón <strong>Sugerir</strong>. Redacta una
            respuesta usando el nivel del cliente, sus puntos y el estado de su último pedido, y la
            escribe en el campo para que la corrijas.
          </p>
          <p className="texto-suave mt-2 text-sm">
            No envía nada. Si le falta un dato lo deja entre corchetes en vez de inventarlo.
          </p>
          <Link
            href="/bandeja"
            className="mt-3 inline-block text-sm text-orange-600 hover:underline dark:text-orange-400"
          >
            Ir a la Bandeja
          </Link>
        </Tarjeta>

        <Tarjeta>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="font-semibold">Maridaje en la mesa</h2>
            <Etiqueta tono={d.configurado ? 'exito' : 'aviso'}>
              {d.configurado ? 'listo' : 'sin llave'}
            </Etiqueta>
          </div>
          <p className="texto-suave text-sm">
            Quien escanea el QR de la mesa recibe una sugerencia de bebida para lo que está
            comiendo, según su perfil de paladar. Es venta añadida en el momento exacto del
            consumo.
          </p>
          <Link
            href="/qr"
            className="mt-3 inline-block text-sm text-orange-600 hover:underline dark:text-orange-400"
          >
            Ver los códigos QR
          </Link>
        </Tarjeta>

        <Tarjeta>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="font-semibold">Alerta de calidad</h2>
            <Etiqueta tono={d.configurado ? 'exito' : 'aviso'}>
              {d.configurado ? 'listo' : 'sin llave'}
            </Etiqueta>
          </div>
          <p className="texto-suave text-sm">
            Cada reseña que entra se lee buscando señales de un fallo de producción —un lote
            salado, una textura rara— y no solo una nota baja. Una queja repetida sobre lo mismo
            es un problema de cocina, no de servicio.
          </p>
          <Link
            href="/resenas"
            className="mt-3 inline-block text-sm text-orange-600 hover:underline dark:text-orange-400"
          >
            Ver reseñas
          </Link>
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta
          titulo="Conversaciones donde puedes usarlo ahora"
          accion={
            <Link href="/bandeja" className="text-sm text-orange-600 hover:underline dark:text-orange-400">
              Abrir bandeja
            </Link>
          }
        >
          {d.ultimas.length === 0 ? (
            <Vacio>
              No hay ninguna conversación con la ventana de 24 h abierta. El borrador solo sirve
              cuando el cliente ha escrito hace menos de un día: fuera de esa ventana, Meta obliga
              a usar una plantilla aprobada y el texto libre se rechaza.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.ultimas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href="/bandeja" className="cifras truncate text-sm hover:underline">
                    {c.telefono}
                  </Link>
                  <span className="texto-suave shrink-0 text-xs">
                    {c.ultimo ? new Date(c.ultimo).toLocaleString('es-CO') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
