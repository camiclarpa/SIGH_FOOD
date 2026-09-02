// =============================================================================
// Piezas de interfaz compartidas por las pantallas del CRM
// =============================================================================

import type { ReactNode } from 'react';

/**
 * Texto legible de la antigüedad, para avisar en pantalla.
 *
 * Vive aquí y no en lib/respaldo.ts —donde se calcula el dato— porque ese
 * módulo importa @/lib/cloudflare para el propio conRespaldo(), y un
 * componente cliente que solo quisiera esta función de texto arrastraba con
 * ella el driver de Postgres entero al bundle del navegador. Mismo criterio
 * que ya separó roles.ts de permisos.ts.
 */
export function describirAntiguedad(segundos: number): string {
  if (segundos < 60) return 'hace menos de un minuto';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} minuto${minutos === 1 ? '' : 's'}`;
  const horas = Math.round(minutos / 60);
  return `hace ${horas} hora${horas === 1 ? '' : 's'}`;
}

// -----------------------------------------------------------------------------
// Etiquetas de estado
// -----------------------------------------------------------------------------

/**
 * Colores por estado, en un único sitio.
 *
 * Repartir las clases por cada pantalla es como acaban dos vistas pintando
 * "critical" de distinto color y nadie sabe cuál es el bueno.
 */
const TONOS = {
  exito: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  aviso: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  riesgo: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  neutro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  marca: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
} as const;

export type Tono = keyof typeof TONOS;

export function Etiqueta({ children, tono = 'neutro' }: { children: ReactNode; tono?: Tono }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONOS[tono]}`}>
      {children}
    </span>
  );
}

/** Nombres legibles y tono de cada etapa del embudo. */
export const ETAPAS: Record<string, { texto: string; tono: Tono }> = {
  lead_landing: { texto: 'Lead', tono: 'neutro' },
  lemon_test_pending: { texto: 'Prueba pendiente', tono: 'aviso' },
  lemon_test_passed: { texto: 'Prueba superada', tono: 'info' },
  consignation_active: { texto: 'Consignación activa', tono: 'marca' },
  recurring_client: { texto: 'Cliente recurrente', tono: 'exito' },
  saas_converted: { texto: 'Convertido a SaaS', tono: 'exito' },
  churned: { texto: 'Baja', tono: 'riesgo' },
};

export const RIESGOS: Record<string, { texto: string; tono: Tono }> = {
  low: { texto: 'Bajo', tono: 'exito' },
  medium: { texto: 'Medio', tono: 'aviso' },
  high: { texto: 'Alto', tono: 'riesgo' },
  critical: { texto: 'Crítico', tono: 'riesgo' },
};

export const NIVELES_LEAD: Record<string, { texto: string; tono: Tono }> = {
  cold: { texto: 'Frío', tono: 'neutro' },
  warm: { texto: 'Templado', tono: 'info' },
  hot: { texto: 'Caliente', tono: 'aviso' },
  qualified: { texto: 'Calificado', tono: 'exito' },
};

export function EtiquetaEtapa({ etapa }: { etapa: string | null }) {
  const d = ETAPAS[etapa ?? ''] ?? { texto: etapa ?? '—', tono: 'neutro' as Tono };
  return <Etiqueta tono={d.tono}>{d.texto}</Etiqueta>;
}

export function EtiquetaRiesgo({ riesgo }: { riesgo: string | null }) {
  const d = RIESGOS[riesgo ?? ''] ?? { texto: '—', tono: 'neutro' as Tono };
  return <Etiqueta tono={d.tono}>{d.texto}</Etiqueta>;
}

// -----------------------------------------------------------------------------
// Contenedores
// -----------------------------------------------------------------------------

/**
 * Contenedor de sección.
 *
 * `titulo` y `accion` van aquí y no repetidos en cada pantalla: con doce
 * tarjetas repartidas por el CRM, mantener la cabecera a mano en cada una es
 * como acaban con tamaños y separaciones distintas sin que nadie lo decida.
 */
export function Tarjeta({
  children,
  titulo,
  accion,
  className = '',
}: {
  children: ReactNode;
  titulo?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`superficie rounded-xl border p-5 shadow-sm ${className}`}>
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </div>
  );
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {accion}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="texto-suave rounded-lg border border-dashed borde-tema px-6 py-10 text-center text-sm">
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Métricas
// -----------------------------------------------------------------------------

export function Metrica({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  tono?: Tono;
}) {
  const acento: Record<Tono, string> = {
    exito: 'text-green-600 dark:text-green-400',
    aviso: 'text-amber-600 dark:text-amber-400',
    riesgo: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
    marca: 'text-orange-600 dark:text-orange-400',
    neutro: '',
  };

  return (
    <Tarjeta>
      <p className="texto-suave text-xs font-medium uppercase tracking-wide">{etiqueta}</p>
      <p className={`cifras mt-2 text-3xl font-semibold ${acento[tono]}`}>{valor}</p>
      {detalle && <p className="texto-suave mt-1 text-xs">{detalle}</p>}
    </Tarjeta>
  );
}

/** Barra de progreso simple, acotada a [0, 100]. */
export function Barra({ porcentaje, tono = 'marca' }: { porcentaje: number; tono?: Tono }) {
  const relleno: Record<Tono, string> = {
    exito: 'bg-green-500',
    aviso: 'bg-amber-500',
    riesgo: 'bg-red-500',
    info: 'bg-blue-500',
    marca: 'bg-orange-500',
    neutro: 'bg-slate-400',
  };
  // Un valor fuera de rango desbordaría el contenedor en vez de fallar visible.
  const ancho = Math.min(100, Math.max(0, Number.isFinite(porcentaje) ? porcentaje : 0));

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full ${relleno[tono]}`} style={{ width: `${ancho}%` }} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Formato
// -----------------------------------------------------------------------------

const FORMATO_NUM = new Intl.NumberFormat('es-CO');
const FORMATO_MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function numero(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return FORMATO_NUM.format(Number.isFinite(n) ? n : 0);
}

export function moneda(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return FORMATO_MONEDA.format(Number.isFinite(n) ? n : 0);
}

export function porcentaje(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;
}

export function fecha(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "hace 3 días", para saber de un vistazo si una cuenta está abandonada. */
export function desde(valor: string | Date | null | undefined): string {
  if (!valor) return 'sin actividad';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return 'sin actividad';

  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (dias < 0) return 'en el futuro';
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  if (dias < 365) return `hace ${Math.floor(dias / 30)} meses`;
  return `hace ${Math.floor(dias / 365)} años`;
}

/**
 * Aviso de que lo que se está viendo no viene de la base, sino del respaldo.
 *
 * Sin esto, el modo degradado sería peor que una caída: la pantalla mostraría
 * cifras de hace horas con el mismo aspecto que las de hace un segundo, y
 * alguien decidiría sobre stock o cobros con datos que ya no son ciertos.
 */
export function AvisoDegradado({ edadSegundos }: { edadSegundos?: number }) {
  return (
    <div
      role="status"
      className="mb-4 rounded-md border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
    >
      <strong className="font-semibold">Sin conexión con la base de datos.</strong>{' '}
      Se muestran los últimos datos disponibles
      {typeof edadSegundos === 'number' ? `, de ${describirAntiguedad(edadSegundos)}` : ''}. Los
      cambios que hagas ahora no se guardarán.
    </div>
  );
}
