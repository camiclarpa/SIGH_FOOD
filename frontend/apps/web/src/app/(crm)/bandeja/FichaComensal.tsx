import { fichaComensal } from '@/lib/consultas-b2c';
import { etiquetaLinea } from '@/lib/fidelizacion';
import { Etiqueta, Tarjeta, desde } from '@/components/ui';

const ETIQUETA_MARIDAJE: Record<string, string> = {
  cerveza: '🍺 Cerveza', vino: '🍷 Vino', cafe: '☕ Café', solo: '🌶 Solo',
};

const TONO_PEDIDO: Record<string, 'exito' | 'aviso' | 'info' | 'riesgo' | 'neutro'> = {
  entregado: 'exito',
  en_camino: 'info',
  listo: 'info',
  preparando: 'aviso',
  confirmado: 'aviso',
  recibido: 'neutro',
  cancelado: 'riesgo',
};

/**
 * Contexto 360° del comensal, para el panel lateral de la Bandeja.
 *
 * Server Component aparte: la ficha es lectura pura, sin ningún estado de
 * cliente. Que sea un componente propio (en vez de ir embebido en page.tsx)
 * es lo que permite que la lista de mensajes y el formulario de respuesta no
 * tengan que esperar a esta consulta para pintarse.
 */
export async function FichaComensal({ consumerId }: { consumerId: string }) {
  const { datos: d } = await fichaComensal(consumerId);

  return (
    <Tarjeta titulo="Contexto del comensal">
      {!d.ultimoMomento && !d.ultimoPedido ? (
        <p className="texto-suave text-xs">Sin momentos ni pedidos registrados todavía.</p>
      ) : (
        <div className="space-y-4 text-sm">
          {d.ultimoMomento && (
            <div>
              <p className="texto-suave text-xs uppercase tracking-wide">Último momento</p>
              <p className="mt-1">{etiquetaLinea(d.ultimoMomento.linea)}</p>
              <p className="texto-suave text-xs">
                {desde(d.ultimoMomento.cuando)}
                {d.ultimoMomento.lote ? ` · lote ${d.ultimoMomento.lote}` : ''}
              </p>
            </div>
          )}

          {d.maridajePreferido && (
            <div>
              <p className="texto-suave text-xs uppercase tracking-wide">Lo acompaña con</p>
              <p className="mt-1">{ETIQUETA_MARIDAJE[d.maridajePreferido] ?? d.maridajePreferido}</p>
            </div>
          )}

          {d.ultimoPedido && (
            <div>
              <p className="texto-suave text-xs uppercase tracking-wide">Último pedido</p>
              <p className="cifras mt-1">{d.ultimoPedido.codigo}</p>
              <div className="mt-1 flex items-center gap-2">
                <Etiqueta tono={TONO_PEDIDO[d.ultimoPedido.estado] ?? 'neutro'}>
                  {d.ultimoPedido.estado}
                </Etiqueta>
                <span className="texto-suave text-xs">{desde(d.ultimoPedido.createdAt)}</span>
              </div>
              <p className="cifras mt-1 text-xs">${d.ultimoPedido.totalCOP.toLocaleString('es-CO')}</p>
            </div>
          )}
        </div>
      )}
    </Tarjeta>
  );
}
