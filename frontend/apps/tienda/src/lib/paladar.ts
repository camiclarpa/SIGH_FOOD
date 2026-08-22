// =============================================================================
// Micro-perfilado sensorial
// =============================================================================
//
// Tres preguntas, no un cuestionario. El objetivo no es construir un perfil
// completo: es quitarle a alguien que nunca ha probado esto la parálisis de
// elegir entre cinco nombres que no le dicen nada.
//
// POR QUÉ TRES Y NO SIETE
// -----------------------
// Cada pregunta de más cuesta gente. Tres bastan para separar los cinco conos
// sin ambigüedad, y se contestan en menos de lo que se tarda en leer el
// catálogo — que es la alternativa contra la que compite.
//
// La lógica es pura y vive aquí, sin base de datos, porque la usan las dos
// orillas: el cuestionario para recomendar al instante, y el servidor para
// guardar la preferencia en el comensal cuando pida.

export type Respuesta = string;

export interface Pregunta {
  id: string;
  texto: string;
  /** El valor es lo que se guarda; la etiqueta, lo que se lee. */
  opciones: Array<{ valor: Respuesta; etiqueta: string; emoji: string }>;
}

export const PREGUNTAS: Pregunta[] = [
  {
    id: 'eje',
    texto: '¿Hacia dónde te tira hoy?',
    opciones: [
      { valor: 'salado', etiqueta: 'Salado', emoji: '🧀' },
      { valor: 'dulce', etiqueta: 'Dulce', emoji: '🍯' },
      { valor: 'nose', etiqueta: 'No sé, sorpréndeme', emoji: '🎲' },
    ],
  },
  {
    id: 'picante',
    texto: '¿Y el picante?',
    opciones: [
      { valor: 'nada', etiqueta: 'Ni de broma', emoji: '🚫' },
      { valor: 'poco', etiqueta: 'Un poquito', emoji: '🌶️' },
      { valor: 'mucho', etiqueta: 'Cuanto más mejor', emoji: '🔥' },
    ],
  },
  {
    id: 'intensidad',
    texto: '¿Qué buscas?',
    opciones: [
      { valor: 'contundente', etiqueta: 'Algo contundente', emoji: '💪' },
      { valor: 'ligero', etiqueta: 'Algo ligero', emoji: '🍃' },
      { valor: 'raro', etiqueta: 'Algo que no haya probado', emoji: '👀' },
    ],
  },
];

export type Perfil = Record<string, Respuesta>;

/**
 * Puntúa cada cono contra el perfil.
 *
 * Puntuación y no un árbol de decisiones: con reglas encadenadas, añadir un
 * sexto sabor obliga a rehacer el árbol entero, y una combinación de respuestas
 * imprevista se queda sin recomendación. Sumando puntos siempre gana alguno.
 *
 * Los pesos dicen qué manda: el picante es lo más excluyente —quien dice "ni de
 * broma" no quiere el Volcano por muy salado que sea— y por eso resta más de lo
 * que suma cualquier acierto.
 */
export function recomendar(
  perfil: Perfil,
  conos: Array<{ slug: string; familia: string | null; intensidad: number; disponible: boolean }>
): { slug: string; motivo: string } | null {
  const disponibles = conos.filter((c) => c.disponible);
  if (disponibles.length === 0) return null;

  const puntos = new Map<string, number>();
  const motivos = new Map<string, string[]>();

  const sumar = (slug: string, n: number, motivo?: string) => {
    puntos.set(slug, (puntos.get(slug) ?? 0) + n);
    if (motivo && n > 0) {
      if (!motivos.has(slug)) motivos.set(slug, []);
      motivos.get(slug)!.push(motivo);
    }
  };

  for (const c of disponibles) {
    puntos.set(c.slug, 0);

    // --- Eje dulce/salado ---
    if (perfil.eje === 'salado' && c.familia === 'salado') sumar(c.slug, 3, 'es salado');
    if (perfil.eje === 'dulce' && c.familia === 'dulce') sumar(c.slug, 3, 'es dulce');
    // "Sorpréndeme" premia lo que menos se parece a lo obvio.
    if (perfil.eje === 'nose' && c.familia === 'fresco') sumar(c.slug, 2, 'es el que menos se espera');

    // --- Picante ---
    // Resta más de lo que suma cualquier otra cosa: es la única respuesta que
    // puede arruinar la experiencia entera de alguien.
    if (perfil.picante === 'nada' && c.intensidad >= 3) sumar(c.slug, -6);
    if (perfil.picante === 'poco' && c.intensidad === 2) sumar(c.slug, 2, 'pica lo justo');
    if (perfil.picante === 'poco' && c.intensidad >= 3) sumar(c.slug, -2);
    if (perfil.picante === 'mucho' && c.intensidad >= 3) sumar(c.slug, 4, 'pica de verdad');

    // --- Intensidad buscada ---
    if (perfil.intensidad === 'contundente' && c.intensidad >= 2) sumar(c.slug, 2, 'es contundente');
    if (perfil.intensidad === 'ligero' && c.intensidad === 1) sumar(c.slug, 2, 'es ligero');
    if (perfil.intensidad === 'raro' && c.familia === 'dulce' && c.intensidad === 2) {
      sumar(c.slug, 2, 'es la combinación más rara que tenemos');
    }
  }

  const ordenados = [...puntos.entries()].sort((a, b) => b[1] - a[1]);
  const [ganador] = ordenados;
  if (!ganador) return null;

  const razones = motivos.get(ganador[0]) ?? [];
  const motivo = razones.length > 0
    ? `Porque ${razones.slice(0, 2).join(' y ')}.`
    : 'Es por donde empieza casi todo el mundo.';

  return { slug: ganador[0], motivo };
}

/**
 * Traduce el perfil al formato que guarda el CRM en flavorPreference.
 *
 * Es un Record<linea, peso> que ya usaban los escaneos en mesa. Guardarlo con
 * la misma forma hace que el perfil del cuestionario y el que sale de lo que la
 * persona pide de verdad se sumen en el mismo sitio, en vez de vivir en dos
 * columnas que se contradicen.
 */
export function aPreferencias(perfil: Perfil): Record<string, number> {
  const salida: Record<string, number> = {};

  if (perfil.eje === 'salado') salida.umami_boost = 1;
  if (perfil.eje === 'dulce') salida.sweet_craft = 1;
  if (perfil.picante === 'mucho') salida.spicy_volcano = 2;
  if (perfil.picante === 'nada') salida.taste_shock = 1;
  if (perfil.intensidad === 'raro') salida.flavor_switch = 1;

  return salida;
}
