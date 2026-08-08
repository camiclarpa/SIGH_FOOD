import { getQueueLength, getDLQLength, getProcessedToday } from '@/lib/redisAdmin';

// Componente UI para las tarjetas de métricas
function MetricCard({ title, value, subtitle, color }: { title: string; value: number | string; subtitle: string; color: string }) {
  return (
    <div className={`p-6 rounded-xl border ${color} shadow-sm`}>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  // Fetch de datos en tiempo real desde Redis (Server Component)
  const [pendingLeads, dlqLeads, processedToday] = await Promise.all([
    getQueueLength(),
    getDLQLength(),
    getProcessedToday(),
  ]);

  const lastUpdated = new Date().toLocaleTimeString('es-CO');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 Panel de Observabilidad SIGH_FOOD
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Estado del pipeline de leads en tiempo real. Última actualización: {lastUpdated}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Leads en Cola (Pendientes)"
            value={pendingLeads}
            subtitle="Esperando ser procesados por el Worker"
            color="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
          />
          
          <MetricCard
            title="Procesados Hoy"
            value={processedToday}
            subtitle="Leads enviados exitosamente al CRM"
            color="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          />

          <MetricCard
            title="En Dead Letter Queue (DLQ)"
            value={dlqLeads}
            subtitle="Requieren atención manual (fallos persistentes)"
            color={dlqLeads > 0 ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}
          />
        </div>

        <div className="mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4"> Diagnóstico del Sistema</h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${pendingLeads < 10 ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              Cola de mensajes: {pendingLeads < 10 ? 'Operativa (baja latencia)' : 'Acumulación detectada'}
            </li>
            <li className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-3 ${dlqLeads === 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
              Dead Letter Queue: {dlqLeads === 0 ? 'Sin errores críticos' : `${dlqLeads} leads requieren revisión`}
            </li>
            <li className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-3 bg-blue-500"></span>
              Worker: Activo y procesando en segundo plano
            </li>
          </ul>
        </div>

                <form action={async () => {
            'use server';
            const { logoutAction } = await import('./login/actions');
            await logoutAction();
        }} className="mt-6 text-center">
          <button type="submit" className="text-sm text-red-400 hover:text-red-300 transition-colors">
            🔒 Cerrar sesión
          </button>
        </form>
        <footer className="mt-10 text-center text-sm text-gray-500">
          <p>⚠️ Esta ruta debe protegerse con autenticación en producción.</p>
        </footer>
      </div>
    </div>
  );
}