import Link from 'next/link';
import { hiloConversacion, listarConversaciones } from '@/lib/consultas-b2c';
import { etiquetaNivel } from '@/lib/fidelizacion';
import { puede, rolActual } from '@/lib/permisos';
import { telefonoLegible } from '@/lib/whatsapp/config';
import { Responder } from './Responder';
import { EstadoWhatsApp } from './EstadoWhatsApp';
import { FichaComensal } from './FichaComensal';
import {
  AvisoDegradado,
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
} from '@/components/ui';

export const metadata = { title: 'Bandeja · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/** Marcas de estado de un mensaje saliente, como en el propio WhatsApp. */
const MARCAS: Record<string, string> = {
  pendiente: '·',
  enviado: '✓',
  entregado: '✓✓',
  leido: '✓✓',
  fallido: '⚠',
};

/** Horas que quedan de ventana de 24 h, o null si ya se cerró. */
function horasRestantes(expira: Date | string | null): number | null {
  if (!expira) return null;
  const ms = new Date(expira).getTime() - Date.now();
  return ms > 0 ? Math.floor(ms / 3_600_000) : null;
}

export default async function PaginaBandeja({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const filtro = p.estado === 'sin_atender' || p.estado === 'seguimiento' || p.estado === 'cerrada'
    ? p.estado
    : undefined;

  const [lista, rol] = await Promise.all([listarConversaciones(filtro), rolActual()]);
  const { filas, totales } = lista.datos;

  const abierto = p.chat ?? filas[0]?.id ?? null;
  const hilo = abierto ? (await hiloConversacion(abierto)).datos : null;

  const puedeResponder = puede(rol, 'campanas.probar');

  return (
    <>
      {lista.degradado && <AvisoDegradado edadSegundos={lista.edadSegundos} />}

      <Titulo>Bandeja de WhatsApp</Titulo>

      <EstadoWhatsApp puedeVer={puede(rol, 'campanas.editar')} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica etiqueta="Conversaciones" valor={numero(totales.total)} />
        <Metrica
          etiqueta="Sin atender"
          valor={numero(totales.sinAtender)}
          tono={totales.sinAtender > 0 ? 'aviso' : 'neutro'}
        />
        <Metrica
          etiqueta="Ventana abierta"
          valor={numero(totales.abiertas)}
          detalle="se les puede escribir texto libre"
        />
        <Metrica etiqueta="Cerradas" valor={numero(totales.cerradas)} tono="neutro" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          { valor: undefined, texto: 'Abiertas' },
          { valor: 'sin_atender', texto: 'Sin atender' },
          { valor: 'seguimiento', texto: 'En seguimiento' },
          { valor: 'cerrada', texto: 'Cerradas' },
        ].map((f) => (
          <Link
            key={f.texto}
            href={f.valor ? `/bandeja?estado=${f.valor}` : '/bandeja'}
            className={`rounded-md border px-3 py-1 ${
              filtro === f.valor ? 'border-indigo-500 text-indigo-500' : 'borde-tema'
            }`}
          >
            {f.texto}
          </Link>
        ))}
      </div>

      <div
        className={`mt-4 grid gap-4 ${
          hilo?.conversacion.comensalId ? 'lg:grid-cols-[18rem_1fr_16rem]' : 'lg:grid-cols-[20rem_1fr]'
        }`}
      >
        {/* --- Lista de conversaciones --- */}
        <Tarjeta className="lg:max-h-[38rem] lg:overflow-y-auto">
          {filas.length === 0 ? (
            <Vacio>
              Sin conversaciones. Aparecerán cuando alguien escriba al número de WhatsApp
              del negocio.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {filas.map((c) => {
                const activa = c.id === abierto;
                const ventanaAbierta = c.ventanaExpiraEn
                  ? new Date(c.ventanaExpiraEn) > new Date()
                  : false;

                return (
                  <li key={c.id}>
                    <Link
                      href={`/bandeja?chat=${c.id}${filtro ? `&estado=${filtro}` : ''}`}
                      className={`block py-2.5 ${activa ? 'text-indigo-500' : ''}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {c.comensal ?? c.nombrePerfil ?? telefonoLegible(c.telefono)}
                        </span>
                        {c.sinLeer > 0 && (
                          <span className="cifras shrink-0 rounded-full bg-indigo-600 px-1.5 text-xs text-white">
                            {c.sinLeer}
                          </span>
                        )}
                      </div>

                      <p className="texto-suave truncate text-xs">{c.ultimoTexto ?? 'sin mensajes'}</p>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="texto-suave text-xs">{desde(c.ultimoMensajeEn)}</span>
                        {!ventanaAbierta && <span className="text-xs text-amber-500">cerrada</span>}
                        {c.estado === 'humano' && <Etiqueta tono="info">humano</Etiqueta>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Tarjeta>

        {/* --- Hilo --- */}
        <Tarjeta>
          {!hilo ? (
            <Vacio>Elige una conversación de la lista.</Vacio>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b borde-tema pb-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {hilo.conversacion.comensal ?? hilo.conversacion.nombrePerfil ?? 'Sin nombre'}
                  </h2>
                  <p className="texto-suave cifras text-xs">
                    {telefonoLegible(hilo.conversacion.telefono)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {hilo.conversacion.comensalId ? (
                    <>
                      <Etiqueta tono="info">{etiquetaNivel(hilo.conversacion.nivel)}</Etiqueta>
                      <Link
                        href={`/comensales/${hilo.conversacion.comensalId}`}
                        className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Ver ficha
                      </Link>
                    </>
                  ) : (
                    // Un número que escribe sin estar registrado es un lead: se
                    // dice en vez de dejar el hueco en blanco.
                    <Etiqueta tono="aviso">no registrado</Etiqueta>
                  )}
                </div>
              </div>

              <ul className="mb-3 max-h-[26rem] space-y-2 overflow-y-auto">
                {hilo.mensajes.map((m) => {
                  const mio = m.direccion === 'saliente';
                  return (
                    <li key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          mio
                            ? 'bg-indigo-600 text-white'
                            : 'superficie border borde-tema'
                        }`}
                      >
                        {m.texto ?? <span className="italic opacity-70">[{m.tipo}]</span>}

                        <div className={`mt-1 flex items-center gap-1.5 text-xs ${mio ? 'text-indigo-100' : 'texto-suave'}`}>
                          <span>{desde(m.timestampMeta ?? m.createdAt)}</span>
                          {mio && (
                            <span
                              className={m.estado === 'leido' ? 'text-blue-200' : ''}
                              title={m.errorMensaje ?? m.estado}
                            >
                              {MARCAS[m.estado] ?? ''}
                            </span>
                          )}
                        </div>

                        {/* El error se muestra en el propio hilo: buscarlo en
                            los logs para saber por qué no llegó es demasiado. */}
                        {m.estado === 'fallido' && m.errorMensaje && (
                          <p className="mt-1 rounded bg-red-950/40 px-2 py-1 text-xs text-red-200">
                            {m.errorCodigo}: {m.errorMensaje}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <Responder
                conversationId={hilo.conversacion.id}
                ventanaExpiraEn={
                  hilo.conversacion.ventanaExpiraEn
                    ? new Date(hilo.conversacion.ventanaExpiraEn).toISOString()
                    : null
                }
                restanteInicial={horasRestantes(hilo.conversacion.ventanaExpiraEn)}
                estado={hilo.conversacion.estado}
                puedeResponder={puedeResponder}
                tieneComensal={Boolean(hilo.conversacion.comensalId)}
              />
            </>
          )}
        </Tarjeta>

        {/* --- Contexto del comensal: solo si hay a quién mostrar --- */}
        {hilo?.conversacion.comensalId && (
          <FichaComensal consumerId={hilo.conversacion.comensalId} />
        )}
      </div>
    </>
  );
}
