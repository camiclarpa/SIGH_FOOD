import Link from 'next/link';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  crmAgentHealth,
  crmAgentMetrics,
  crmLearningEpisodes,
  crmPatterns,
  multivariatePredictions,
  approvalRequests,
  agentSecurityLog,
  cotExecutions,
  kgCrmNodes,
  kgCrmEdges,
  embeddingIndex,
  crmProcedures,
} from '@sighfood/domain/db/schema';
import { count, desc, eq } from 'drizzle-orm';
import { configuracion } from '@sighfood/domain/db/schema';
import { puede, rolActual } from '@/lib/permisos';
import { valoresPorDefecto } from '@/lib/umbrales';
import { TarjetaDecision } from '../TarjetaDecision';
import { Umbrales } from '../Umbrales';
import { Sandbox } from '../Sandbox';
import {
  Etiqueta,
  Metrica,
  Tarjeta,
  Titulo,
  Vacio,
  desde,
  numero,
  porcentaje,
} from '@/components/ui';

export const metadata = { title: 'Diagnóstico del agente · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/*
  Las 14 arquitecturas.

  `clave` dice en qué recuento mirar para saber si esa arquitectura ha llegado a
  producir algo. Antes la lista se pintaba entera con la etiqueta "activa", que
  era literalmente falso: ninguna se invoca desde ninguna pantalla y sus tablas
  están vacías. Una pantalla de diagnóstico que afirma que todo va bien es peor
  que no tenerla, porque es justo donde se viene a buscar el problema.
*/
const ARQUITECTURAS: Array<{ id: string; nombre: string; ruta: string; clave?: string }> = [
  { id: 'A1', nombre: 'Análisis estructural', ruta: '/api/ai/architectures/ast' },
  { id: 'A2', nombre: 'Motor de embeddings', ruta: '/api/ai/architectures/embedding', clave: 'embeddings' },
  { id: 'A3', nombre: 'Motor de aprendizaje', ruta: '/api/ai/architectures/learning', clave: 'episodios' },
  { id: 'A4', nombre: 'Memoria de trabajo', ruta: '/api/ai/architectures/working-memory' },
  { id: 'A5', nombre: 'Memoria de tres capas', ruta: '/api/ai/architectures/memory' },
  { id: 'A6', nombre: 'Curva de olvido', ruta: '/api/ai/architectures/forgetting' },
  { id: 'A7', nombre: 'Cadena de razonamiento', ruta: '/api/ai/architectures/reasoning', clave: 'razonamientos' },
  { id: 'A8', nombre: 'Predicción multivariada', ruta: '/api/ai/architectures/prediction', clave: 'predicciones' },
  { id: 'A9', nombre: 'Grafo de conocimiento', ruta: '/api/ai/architectures/kg', clave: 'nodos' },
  { id: 'A10', nombre: 'Explicabilidad (XAI)', ruta: '/api/ai/architectures/xai' },
  { id: 'A11', nombre: 'Sandbox de validación', ruta: '/api/ai/architectures/sandbox' },
  { id: 'A12', nombre: 'Matriz de autonomía', ruta: '/api/ai/architectures/autonomy' },
  { id: 'A13', nombre: 'Seguridad del agente', ruta: '/api/ai/architectures/security', clave: 'seguridad' },
  { id: 'A14', nombre: 'Observabilidad', ruta: '/api/ai/architectures/observability' },
];

async function cargar() {
  return conBaseDeDatos(async (db) => {
    const [
      salud, metricas, episodios, patrones, procedimientos,
      predicciones, aprobaciones, config, seguridad, razonamientos,
      nodos, aristas, embeddings,
    ] = await Promise.all([
      db.select().from(crmAgentHealth).orderBy(desc(crmAgentHealth.checkedAt)).limit(5),
      db.select().from(crmAgentMetrics).orderBy(desc(crmAgentMetrics.recordedAt)).limit(8),
      db.select({ resultado: crmLearningEpisodes.outcome, total: count(crmLearningEpisodes.id) })
        .from(crmLearningEpisodes).groupBy(crmLearningEpisodes.outcome),
      db.select({ estado: crmPatterns.consolidation, total: count(crmPatterns.id) })
        .from(crmPatterns).groupBy(crmPatterns.consolidation),
      db.select({ total: count(crmProcedures.id) }).from(crmProcedures),
      db.select({ tipo: multivariatePredictions.predictionType, total: count(multivariatePredictions.id) })
        .from(multivariatePredictions).groupBy(multivariatePredictions.predictionType),
      db.select().from(approvalRequests).where(eq(approvalRequests.status, 'pending'))
        .orderBy(desc(approvalRequests.createdAt)).limit(10),

      // Los umbrales calibrados. Lo que no esté guardado usa el valor de diseño.
      db.select().from(configuracion),
      db.select({ severidad: agentSecurityLog.severity, total: count(agentSecurityLog.id) })
        .from(agentSecurityLog).groupBy(agentSecurityLog.severity),
      db.select({ decision: cotExecutions.finalDecision, total: count(cotExecutions.id) })
        .from(cotExecutions).groupBy(cotExecutions.finalDecision),
      db.select({ total: count(kgCrmNodes.id) }).from(kgCrmNodes),
      db.select({ total: count(kgCrmEdges.id) }).from(kgCrmEdges),
      db.select({ total: count(embeddingIndex.id) }).from(embeddingIndex),
    ]);

    // Lo guardado pisa al valor de diseño; lo que no esté, se queda con el suyo.
    const umbrales = { ...valoresPorDefecto() };
    for (const fila of config) {
      const v = Number(fila.valor);
      if (Number.isFinite(v)) umbrales[fila.clave] = v;
    }

    return {
      salud, metricas, episodios, patrones, predicciones, aprobaciones, umbrales,
      seguridad, razonamientos,
      procedimientos: procedimientos[0]?.total ?? 0,
      nodos: nodos[0]?.total ?? 0,
      aristas: aristas[0]?.total ?? 0,
      embeddings: embeddings[0]?.total ?? 0,
    };
  });
}

export default async function PaginaAgente() {
  const [d, rol] = await Promise.all([cargar(), rolActual()]);

  const puedeAprobar = puede(rol, 'agente.aprobar');
  const puedeCalibrar = puede(rol, 'agente.calibrar');
  const puedeProbar = puede(rol, 'agente.sandbox');

  const totalEpisodios = d.episodios.reduce((s, e) => s + e.total, 0);
  const exitos = d.episodios.find((e) => e.resultado === 'SUCCESS')?.total ?? 0;
  const totalPatrones = d.patrones.reduce((s, p) => s + p.total, 0);
  const totalPredicciones = d.predicciones.reduce((s, p) => s + p.total, 0);
  const ultimaSalud = d.salud[0];

  /*
    Cuántas filas ha producido cada arquitectura de las que se pueden medir.

    Lo que no está en el mapa no tiene tabla propia que consultar, así que se
    informa como desconocido en vez de darlo por bueno.
  */
  const producido: Record<string, number> = {
    embeddings: d.embeddings,
    episodios: totalEpisodios,
    razonamientos: d.razonamientos.reduce((s, r) => s + r.total, 0),
    predicciones: totalPredicciones,
    nodos: d.nodos,
    seguridad: d.seguridad.reduce((s, r) => s + r.total, 0),
  };

  return (
    <>
      <Titulo>Diagnóstico del agente</Titulo>

      <p className="texto-suave mb-4 max-w-3xl text-sm">
        Estado interno de las catorce arquitecturas. No es una pantalla de trabajo:
        el agente que ayuda a vender está en{' '}
        <Link href="/agente" className="text-indigo-600 hover:underline dark:text-indigo-400">
          Agente IA
        </Link>. Esto se mira cuando algo no cuadra.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          etiqueta="Episodios aprendidos"
          valor={numero(totalEpisodios)}
          detalle={totalEpisodios === 0 ? 'sin datos' : `${Math.round((exitos / totalEpisodios) * 100)}% resueltos con éxito`}
        />
        <Metrica etiqueta="Patrones" valor={numero(totalPatrones)} detalle={`${numero(d.procedimientos)} procedimientos validados`} />
        <Metrica etiqueta="Predicciones" valor={numero(totalPredicciones)} />
        <Metrica
          etiqueta="Aprobaciones pendientes"
          valor={numero(d.aprobaciones.length)}
          tono={d.aprobaciones.length > 0 ? 'aviso' : 'neutro'}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-2">
          <h2 className="mb-1 font-semibold">Las 14 arquitecturas</h2>
          <p className="texto-suave mb-4 text-sm">
            Expuestas por HTTP y sin invocar desde ninguna pantalla. La etiqueta dice si han
            llegado a producir datos, no si el endpoint responde.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ARQUITECTURAS.map((a) => {
              const filas = a.clave === undefined ? null : (producido[a.clave] ?? 0);
              return (
                <div key={a.id} className="superficie flex items-center gap-3 rounded-lg border px-3 py-2">
                  <span className="texto-suave cifras w-8 shrink-0 text-xs font-medium">{a.id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm" title={a.nombre}>{a.nombre}</span>
                  {filas === null ? (
                    <Etiqueta tono="neutro">sin medir</Etiqueta>
                  ) : (
                    <Etiqueta tono={filas > 0 ? 'exito' : 'neutro'}>
                      {filas > 0 ? `${numero(filas)} filas` : 'sin uso'}
                    </Etiqueta>
                  )}
                </div>
              );
            })}
          </div>
        </Tarjeta>

        <div className="space-y-4">
          <Tarjeta>
            <h2 className="mb-3 font-semibold">Salud</h2>
            {!ultimaSalud ? (
              <Vacio>Sin registros de salud.</Vacio>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="texto-suave">Estado</dt>
                  <dd><Etiqueta tono={ultimaSalud.healthStatus === 'healthy' ? 'exito' : 'aviso'}>{ultimaSalud.healthStatus}</Etiqueta></dd>
                </div>
                {[
                  ['Inteligencia', ultimaSalud.intelligenceScore],
                  ['Deriva', ultimaSalud.driftScore],
                  ['Falsos positivos', ultimaSalud.fpRate],
                  ['Aceptación', ultimaSalud.acceptanceRate],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-3">
                    <dt className="texto-suave">{k}</dt>
                    <dd className="cifras font-medium">{porcentaje(v as string)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3">
                  <dt className="texto-suave">Revisado</dt>
                  <dd className="text-xs">{desde(ultimaSalud.checkedAt)}</dd>
                </div>
              </dl>
            )}
          </Tarjeta>

          <Tarjeta>
            <h2 className="mb-3 font-semibold">Grafo y búsqueda</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="texto-suave">Nodos del grafo</dt>
                <dd className="cifras font-medium">{numero(d.nodos)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="texto-suave">Relaciones</dt>
                <dd className="cifras font-medium">{numero(d.aristas)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="texto-suave">Entidades indexadas</dt>
                <dd className="cifras font-medium">{numero(d.embeddings)}</dd>
              </div>
            </dl>
          </Tarjeta>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-semibold">Aprobaciones pendientes</h2>
          {d.aprobaciones.length === 0 ? (
            <Vacio>Nada esperando aprobación humana.</Vacio>
          ) : (
            <ul className="space-y-3">
              {d.aprobaciones.map((a) => (
                <TarjetaDecision
                  key={a.id}
                  puedeAprobar={puedeAprobar}
                  solicitud={{
                    id: a.id,
                    accion: a.actionType ?? 'acción sin nombre',
                    datos: (a.approvalData ?? null) as Record<string, unknown> | null,
                    creada: desde(a.createdAt),
                    expira: a.expiresAt ? new Date(a.expiresAt).toISOString() : null,
                  }}
                />
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-semibold">Últimas métricas</h2>
          {d.metricas.length === 0 ? (
            <Vacio>El agente todavía no ha registrado métricas.</Vacio>
          ) : (
            <ul className="divide-y borde-tema text-sm">
              {d.metricas.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate" title={m.metricName}>{m.metricName}</span>
                  <span className="cifras shrink-0 font-medium">{numero(m.metricValue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Calibración del agente">
          <p className="texto-suave mb-4 text-xs">
            Estos números deciden a quién se persigue y a quién se da por perdido. Estaban
            fijos en el código: cambiarlos exigía un despliegue.
          </p>
          <Umbrales valores={d.umbrales} puedeCalibrar={puedeCalibrar} />
        </Tarjeta>

        <Tarjeta titulo="Sandbox">
          <p className="texto-suave mb-4 text-xs">
            Prueba cómo reaccionaría el agente ante un comensal inventado. Nada de lo que
            ocurra aquí se guarda ni se envía a nadie.
          </p>
          <Sandbox puedeProbar={puedeProbar} />
        </Tarjeta>
      </div>

    </>
  );
}
