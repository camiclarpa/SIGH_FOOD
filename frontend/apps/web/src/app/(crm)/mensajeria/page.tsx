import Link from 'next/link';
import { resumenMensajeria } from '@/lib/consultas-b2c';
import { motivoNoEnviable } from '@/lib/plantillas';
import { puede, rolActual } from '@/lib/permisos';
import { EditorSecuencia } from './EditorSecuencia';
import { InterruptorSecuencia } from './InterruptorSecuencia';
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

export const metadata = { title: 'Mensajería · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

const DISPARADORES: Record<string, string> = {
  signup: 'Al registrarse',
  first_purchase: 'Tras el primer momento',
  abandoned_cart: 'Flujo abandonado',
  birthday: 'Cumpleaños',
  inactive_30_days: 'Por inactividad',
  churn_risk: 'Riesgo de abandono',
  referral_conversion: 'Referido convertido',
};

const CANALES: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
};

const ESTADOS: Record<string, 'exito' | 'aviso' | 'neutro'> = {
  active: 'exito',
  paused: 'aviso',
  draft: 'neutro',
  completed: 'neutro',
};

export default async function PaginaMensajeria() {
  const [{ datos: d, degradado, edadSegundos }, rol] = await Promise.all([
    resumenMensajeria(),
    rolActual(),
  ]);

  const puedeEditar = puede(rol, 'campanas.editar');
  const puedeActivar = puede(rol, 'campanas.activar');

  const activas = d.secuencias.filter((s) => s.status === 'active').length;
  const tasa = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100));

  return (
    <>
      {degradado && <AvisoDegradado edadSegundos={edadSegundos} />}

      <Titulo>Mensajería</Titulo>
      <p className="texto-suave -mt-2 mb-4 text-sm">
        Automatizaciones que alcanzan al comensal cuando ya salió del bar.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Secuencias activas"
          valor={`${activas} / ${d.secuencias.length}`}
          detalle={activas === 0 ? 'ninguna está enviando' : 'enviando'}
          tono={activas === 0 ? 'aviso' : 'exito'}
        />
        <Metrica etiqueta="Mensajes enviados" valor={numero(d.totales.enviados)} />
        <Metrica
          etiqueta="Apertura"
          valor={`${tasa(d.totales.abiertos, d.totales.enviados)}%`}
          detalle={`${numero(d.totales.abiertos)} abiertos`}
        />
        <Metrica
          etiqueta="Conversión"
          valor={`${tasa(d.totales.convertidos, d.totales.enviados)}%`}
          detalle={`${numero(d.totales.convertidos)} volvieron a escanear`}
          tono={d.totales.convertidos > 0 ? 'exito' : 'neutro'}
        />
      </div>

      {activas === 0 && d.secuencias.length > 0 && (
        <div
          role="status"
          className="mt-4 rounded-md border border-blue-700/50 bg-blue-950/30 px-4 py-3 text-sm text-blue-200"
        >
          <strong className="font-semibold">Todas las secuencias están en borrador.</strong>{' '}
          Se crean así a propósito: activarlas empieza a enviar mensajes reales a comensales
          reales, y esa decisión no debería tomarla un script de datos iniciales.
        </div>
      )}

      <div className="mt-6">
        <Tarjeta titulo="Secuencias" accion={puedeEditar ? <EditorSecuencia /> : null}>
          {d.secuencias.length === 0 ? (
            <Vacio>
              Sin secuencias definidas. Ejecuta{' '}
              <code className="cifras">node scripts/sembrar-b2c.mjs</code> para crear las iniciales.
            </Vacio>
          ) : (
            <ul className="divide-y borde-tema">
              {d.secuencias.map((s) => (
                <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium">{s.name}</h3>
                        <Etiqueta tono={ESTADOS[s.status ?? 'draft'] ?? 'neutro'}>
                          {s.status === 'active' ? 'activa' : s.status === 'paused' ? 'pausada' : 'borrador'}
                        </Etiqueta>
                        <Etiqueta tono="info">{CANALES[s.channel ?? ''] ?? s.channel}</Etiqueta>
                        {puedeEditar && (
                          <EditorSecuencia
                            secuencia={{
                              id: s.id,
                              name: s.name ?? '',
                              trigger: s.trigger ?? 'signup',
                              channel: s.channel ?? 'whatsapp',
                              template: s.template ?? '',
                              delayHours: s.delayHours ?? 0,
                              targetSegment: s.targetSegment,
                              metaTemplateName: s.metaTemplateName,
                              metaTemplateLang: s.metaTemplateLang,
                              metaTemplateVars: s.metaTemplateVars ?? null,
                            }}
                            puedeProbar={puedeActivar}
                          />
                        )}
                      </div>

                      <p className="texto-suave mt-1 text-xs">
                        {DISPARADORES[s.trigger ?? ''] ?? s.trigger}
                        {s.delayHours ? ` · espera ${s.delayHours}h` : ' · inmediato'}
                        {s.targetSegment ? ` · segmento: ${s.targetSegment}` : ''}
                      </p>

                      {/*
                        La plantilla se muestra entera: es el texto que va a
                        recibir una persona real, y revisarlo es la única forma
                        de detectar un marcador sin sustituir antes de enviarlo.
                      */}
                      {s.template && (
                        <p className="texto-suave mt-2 rounded-md border borde-tema px-3 py-2 text-xs">
                          {s.template}
                        </p>
                      )}

                      {/*
                        El texto de arriba es el del CRM. Fuera de la ventana de
                        24 h, WhatsApp entrega la plantilla aprobada en Meta y no
                        eso, así que se dice cuál es — y se avisa cuando falta,
                        porque sin ella la campaña no puede activarse.
                      */}
                      {s.channel === 'whatsapp' && (
                        !motivoNoEnviable(s) ? (
                          <p className="texto-suave mt-1.5 text-xs">
                            Plantilla de Meta: <span className="cifras">{s.metaTemplateName}</span>
                            {s.metaTemplateLang ? ` (${s.metaTemplateLang})` : ''}
                            {s.metaTemplateVars?.length
                              ? ` · huecos: ${s.metaTemplateVars.map((v, i) => `{{${i + 1}}}=${v}`).join(', ')}`
                              : ''}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-xs text-amber-500">
                            No se puede activar: {motivoNoEnviable(s)}
                          </p>
                        )
                      )}
                    </div>

                    <div className="shrink-0">
                      <InterruptorSecuencia
                        id={s.id}
                        nombre={s.name ?? 'la secuencia'}
                        activa={s.status === 'active'}
                        puedeActivar={puedeActivar}
                        puedeEditar={puedeEditar}
                      />
                    </div>

                    <dl className="grid shrink-0 grid-cols-4 gap-x-4 text-center text-xs">
                      <div>
                        <dt className="texto-suave">Env.</dt>
                        <dd className="cifras font-medium">{numero(s.metricas.enviados)}</dd>
                      </div>
                      <div>
                        <dt className="texto-suave">Abr.</dt>
                        <dd className="cifras font-medium">{numero(s.metricas.abiertos)}</dd>
                      </div>
                      <div>
                        <dt className="texto-suave">Conv.</dt>
                        <dd className="cifras font-medium">{numero(s.metricas.convertidos)}</dd>
                      </div>
                      <div>
                        <dt className="texto-suave">Err.</dt>
                        <dd
                          className={`cifras font-medium ${
                            s.metricas.errores > 0 ? 'text-red-600 dark:text-red-400' : ''
                          }`}
                        >
                          {numero(s.metricas.errores)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6">
        <Tarjeta titulo="Últimos envíos">
          {d.ultimos.length === 0 ? (
            <Vacio>
              Todavía no se ha enviado ningún mensaje. Ocurrirá cuando se active una secuencia
              y un comensal cumpla su disparador.
            </Vacio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="texto-suave border-b borde-tema text-left text-xs uppercase tracking-wide">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Comensal</th>
                    <th className="pb-2 pr-3 font-medium">Secuencia</th>
                    <th className="pb-2 pr-3 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Enviado</th>
                  </tr>
                </thead>
                <tbody className="divide-y borde-tema">
                  {d.ultimos.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 pr-3">
                        {l.comensalId ? (
                          <Link href={`/comensales/${l.comensalId}`} className="hover:underline">
                            {l.comensal ?? 'Sin nombre'}
                          </Link>
                        ) : (
                          <span className="texto-suave">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {l.secuencia ?? '—'}
                        <p className="texto-suave text-xs">{CANALES[l.canal ?? ''] ?? l.canal}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        {l.error ? (
                          <Etiqueta tono="riesgo">error</Etiqueta>
                        ) : l.convertido ? (
                          <Etiqueta tono="exito">convertido</Etiqueta>
                        ) : l.abierto ? (
                          <Etiqueta tono="info">abierto</Etiqueta>
                        ) : (
                          <Etiqueta tono="neutro">{l.estado ?? 'enviado'}</Etiqueta>
                        )}
                      </td>
                      <td className="texto-suave py-2.5 text-xs">{desde(l.enviado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
