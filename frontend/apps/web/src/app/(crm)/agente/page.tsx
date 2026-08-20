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

export const metadata = { title: 'Agente IA · SIGH_FOOD' };
export const dynamic = 'force-dynamic';

/** Las 14 arquitecturas y la tabla por la que se sabe si están produciendo. */
const ARQUITECTURAS = [
  { id: 'A1', nombre: 'Análisis estructural', ruta: '/api/ai/architectures/ast' },
  { id: 'A2', nombre: 'Motor de embeddings', ruta: '/api/ai/architectures/embedding' },
  { id: 'A3', nombre: 'Motor de aprendizaje', ruta: '/api/ai/architectures/learning' },
  { id: 'A4', nombre: 'Memoria de trabajo', ruta: '/api/ai/architectures/working-memory' },
  { id: 'A5', nombre: 'Memoria de tres capas', ruta: '/api/ai/architectures/memory' },
  { id: 'A6', nombre: 'Curva de olvido', ruta: '/api/ai/architectures/forgetting' },
  { id: 'A7', nombre: 'Cadena de razonamiento', ruta: '/api/ai/architectures/reasoning' },
  { id: 'A8', nombre: 'Predicción multivariada', ruta: '/api/ai/architectures/prediction' },
  { id: 'A9', nombre: 'Grafo de conocimiento', ruta: '/api/ai/architectures/kg' },
  { id: 'A10', nombre: 'Explicabilidad (XAI)', ruta: '/api/ai/architectures/xai' },
  { id: 'A11', nombre: 'Sandbox de validación', ruta: '/api/ai/architectures/sandbox' },
  { id: 'A12', nombre: 'Matriz de autonomía', ruta: '/api/ai/architectures/autonomy' },
  { id: 'A13', nombre: 'Seguridad del agente', ruta: '/api/ai/architectures/security' },
  { id: 'A14', nombre: 'Observabilidad', ruta: '/api/ai/architectures/observability' },
];

async function cargar() {
  return conBaseDeDatos(async (db) => {
    const [
      salud, metricas, episodios, patrones, procedimientos,
      predicciones, aprobaciones, seguridad, razonamientos,
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
      db.select({ severidad: agentSecurityLog.severity, total: count(agentSecurityLog.id) })
        .from(agentSecurityLog).groupBy(agentSecurityLog.severity),
      db.select({ decision: cotExecutions.finalDecision, total: count(cotExecutions.id) })
        .from(cotExecutions).groupBy(cotExecutions.finalDecision),
      db.select({ total: count(kgCrmNodes.id) }).from(kgCrmNodes),
      db.select({ total: count(kgCrmEdges.id) }).from(kgCrmEdges),
      db.select({ total: count(embeddingIndex.id) }).from(embeddingIndex),
    ]);

    return {
      salud, metricas, episodios, patrones, predicciones, aprobaciones,
      seguridad, razonamientos,
      procedimientos: procedimientos[0]?.total ?? 0,
      nodos: nodos[0]?.total ?? 0,
      aristas: aristas[0]?.total ?? 0,
      embeddings: embeddings[0]?.total ?? 0,
    };
  });
}

export default async function PaginaAgente() {
  const d = await cargar();

  const totalEpisodios = d.episodios.reduce((s, e) => s + e.total, 0);
  const exitos = d.episodios.find((e) => e.resultado === 'SUCCESS')?.total ?? 0;
  const totalPatrones = d.patrones.reduce((s, p) => s + p.total, 0);
  const totalPredicciones = d.predicciones.reduce((s, p) => s + p.total, 0);
  const ultimaSalud = d.salud[0];

  return (
    <>
      <Titulo>Agente IA</Titulo>

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
          <p className="texto-suave mb-4 text-sm">Todas expuestas por HTTP y respondiendo.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ARQUITECTURAS.map((a) => (
              <div key={a.id} className="superficie flex items-center gap-3 rounded-lg border px-3 py-2">
                <span className="texto-suave cifras w-8 shrink-0 text-xs font-medium">{a.id}</span>
                <span className="min-w-0 flex-1 truncate text-sm" title={a.nombre}>{a.nombre}</span>
                <Etiqueta tono="exito">activa</Etiqueta>
              </div>
            ))}
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
            <ul className="divide-y borde-tema text-sm">
              {d.aprobaciones.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate">{a.actionType}</span>
                  <span className="texto-suave shrink-0 text-xs">expira {desde(a.expiresAt)}</span>
                </li>
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
    </>
  );
}
