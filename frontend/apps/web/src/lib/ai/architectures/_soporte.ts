// =============================================================================
// Soporte común de las 14 arquitecturas
// =============================================================================

import type {
  kgDomainEnum,
  patternConsolidationEnum,
  autonomyActionEnum,
  sandboxPhaseEnum,
  xaiEvidenceTypeEnum,
  observabilityMetricTypeEnum,
  agentHealthStatusEnum,
  kgRelationTypeEnum,
  environmentEnum,
  embeddingModelEnum,
  predictionHorizonEnum,
} from '@sighfood/domain/db/schema';

export { conBaseDeDatos } from '@/lib/cloudflare';

// Uniones literales de cada enum, para no repartir `as any` por las llamadas.
// Un `as any` sobre estas columnas no solo silencia al compilador: deja pasar
// cualquier cadena hasta el INSERT, donde Postgres la rechaza con un error de
// tipo que no dice de qué campo viene.
type Valores<T> = T extends { enumValues: readonly (infer V)[] } ? V : never;

export type DominioCrm = Valores<typeof kgDomainEnum>;
export type Consolidacion = Valores<typeof patternConsolidationEnum>;
export type AccionAutonomia = Valores<typeof autonomyActionEnum>;
export type FaseSandbox = Valores<typeof sandboxPhaseEnum>;
export type TipoEvidenciaXai = Valores<typeof xaiEvidenceTypeEnum>;
export type TipoMetrica = Valores<typeof observabilityMetricTypeEnum>;
export type EstadoSalud = Valores<typeof agentHealthStatusEnum>;
export type TipoRelacionKg = Valores<typeof kgRelationTypeEnum>;
export type Entorno = Valores<typeof environmentEnum>;
export type ModeloEmbedding = Valores<typeof embeddingModelEnum>;
export type Horizonte = Valores<typeof predictionHorizonEnum>;

/**
 * Convierte un número al formato que Drizzle espera en una columna `numeric`.
 *
 * Drizzle tipa `numeric` como `string`, no como `number`, y con razón: un
 * NUMERIC de Postgres es decimal exacto y puede desbordar el doble de IEEE-754.
 * Pasarle un número no compila, y forzarlo con `as any` reintroduce el redondeo
 * binario que la columna existe para evitar.
 *
 * `escala` debe coincidir con la de la columna (todas las de estas tablas usan
 * scale 2), para que el valor guardado sea el mismo que se lea después.
 */
export function dec(valor: number, escala?: number): string;
export function dec(valor: number | null | undefined, escala?: number): string | null;
export function dec(valor: number | null | undefined, escala = 2): string | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  return valor.toFixed(escala);
}

/**
 * Lee una columna `numeric` como número.
 *
 * Postgres devuelve string; sin esto, `pattern.confidenceScore * 2` concatena en
 * vez de multiplicar y el fallo pasa desapercibido hasta que un umbral no salta.
 */
export function num(valor: string | number | null | undefined, porDefecto = 0): number {
  if (valor === null || valor === undefined) return porDefecto;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isNaN(n) ? porDefecto : n;
}
