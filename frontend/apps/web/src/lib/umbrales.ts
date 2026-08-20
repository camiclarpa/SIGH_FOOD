// =============================================================================
// Umbrales calibrables del agente
// =============================================================================
//
// Estaban repartidos como constantes por el código —DIAS_RIESGO en las
// consultas, 0.30 y 0.50 en la curva de olvido, 3 en la creación de patrones—.
// Cambiar cualquiera exigía un despliegue, así que en la práctica nadie los
// tocaba y el agente operaba siempre con los valores que alguien eligió una vez,
// sin datos, al escribir esa línea.
//
// Vive fuera de acciones/agente.ts porque ese archivo lleva 'use server' y ahí
// todo lo exportado debe ser una función async.

export interface DefinicionUmbral {
  clave: string;
  etiqueta: string;
  descripcion: string;
  /** Valor con el que se diseñó el sistema. */
  porDefecto: number;
  min: number;
  max: number;
  paso: number;
  unidad: string;
  /** Qué pasa si se sube y qué si se baja. Se pinta bajo el control. */
  efecto: string;
}

export const UMBRALES = [
  {
    clave: 'dias_riesgo',
    etiqueta: 'Días para considerar "en riesgo"',
    descripcion: 'Sin escanear durante este tiempo, el comensal entra en riesgo de olvido.',
    porDefecto: 15,
    min: 3,
    max: 60,
    paso: 1,
    unidad: 'días',
    efecto:
      'Bajarlo detecta antes a quien se está yendo, pero marca en riesgo a gente que ' +
      'simplemente no ha salido esta semana. Subirlo reduce falsos avisos y llega más tarde.',
  },
  {
    clave: 'dias_dormido',
    etiqueta: 'Días para considerar "dormido"',
    descripcion: 'A partir de aquí se considera que el comensal ya se perdió.',
    porDefecto: 45,
    min: 15,
    max: 180,
    paso: 5,
    unidad: 'días',
    efecto: 'Marca el punto en que se deja de insistir. Muy bajo, se abandona a quien aún volvería.',
  },
  {
    clave: 'puntos_por_escaneo',
    etiqueta: 'Puntos por momento registrado',
    descripcion: 'Cuántos puntos gana el comensal cada vez que escanea.',
    porDefecto: 10,
    min: 1,
    max: 100,
    paso: 1,
    unidad: 'puntos',
    efecto:
      'Subirlo hace los premios más alcanzables y acelera el programa; también los abarata. ' +
      'Cambiarlo NO recalcula los saldos ya emitidos.',
  },
  {
    clave: 'episodios_para_patron',
    etiqueta: 'Episodios para crear un patrón',
    descripcion: 'Cuántos casos parecidos necesita el agente antes de generalizar.',
    porDefecto: 3,
    min: 2,
    max: 20,
    paso: 1,
    unidad: 'casos',
    efecto:
      'Bajarlo hace que el agente aprenda más rápido y también que generalice desde ' +
      'coincidencias. Subirlo lo hace más prudente y más lento.',
  },
  {
    clave: 'confianza_deprecar',
    etiqueta: 'Confianza mínima antes de deprecar',
    descripcion: 'Por debajo de este valor, un patrón aprendido se marca como obsoleto.',
    porDefecto: 0.3,
    min: 0.05,
    max: 0.8,
    paso: 0.05,
    unidad: '',
    efecto: 'Subirlo limpia antes el conocimiento viejo, a riesgo de tirar patrones que aún servían.',
  },
  {
    clave: 'riesgo_para_actuar',
    etiqueta: 'Riesgo mínimo para que el agente proponga actuar',
    descripcion: 'Por debajo de este riesgo de abandono, el agente no sugiere nada.',
    porDefecto: 0.5,
    min: 0.1,
    max: 0.95,
    paso: 0.05,
    unidad: '',
    efecto:
      'Bajarlo genera más propuestas —y más ruido en la cola de aprobaciones—. ' +
      'Subirlo hace que solo avise de los casos claros.',
  },
] as const satisfies readonly DefinicionUmbral[];

export type ClaveUmbral = (typeof UMBRALES)[number]['clave'];

/** Valores de diseño, para cuando no hay nada guardado. */
export function valoresPorDefecto(): Record<string, number> {
  return Object.fromEntries(UMBRALES.map((u) => [u.clave, u.porDefecto]));
}
