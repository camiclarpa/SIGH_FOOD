// =============================================================================
// Catálogos de Contenido, Activaciones y Embajadores
// =============================================================================
//
// Viven aparte de los editores ('use client') a propósito: page.tsx —un Server
// Component— también necesita estas listas para traducir un valor guardado a
// su texto legible, y un Server Component que importa una constante desde un
// módulo 'use client' no siempre la recibe bien en tiempo de ejecución. La
// referencia de cliente que genera el bundler de RSC para ese módulo puede no
// exponer el valor tal cual del lado del servidor.
//
// Pasó de verdad: ESTADOS_EMBAJADOR vivía en EditorEmbajador.tsx, y en cuanto
// existió el primer embajador de producción, embajadores/page.tsx lanzó
// "ESTADOS_EMBAJADOR.find is not a function" al intentar leerlo — con la
// tabla vacía nunca se había ejecutado esa línea, así que el bug llevaba
// dormido desde que se escribió la pantalla. Un módulo neutral, sin directiva,
// es lo único que ambos lados —Server Component y Client Component— pueden
// importar con la garantía de recibir el mismo array.

export const TIPOS_CONTENIDO = [
  { valor: 'video', texto: 'Vídeo corto' },
  { valor: 'guia', texto: 'Guía' },
  { valor: 'reto', texto: 'Reto' },
  { valor: 'storytelling', texto: 'Storytelling' },
  { valor: 'receta', texto: 'Receta' },
  { valor: 'ugc', texto: 'Contenido de un cliente' },
  { valor: 'maridaje', texto: 'Maridaje' },
  { valor: 'campana', texto: 'Campaña' },
];

export const CANALES_CONTENIDO = [
  { valor: 'instagram', texto: 'Instagram' },
  { valor: 'tiktok', texto: 'TikTok' },
  { valor: 'whatsapp', texto: 'WhatsApp' },
  { valor: 'vip', texto: 'Comunidad VIP' },
  { valor: 'web', texto: 'Web' },
  { valor: 'otro', texto: 'Otro' },
];

export const ESTADOS_CONTENIDO = [
  { valor: 'idea', texto: 'Idea' },
  { valor: 'produccion', texto: 'En producción' },
  { valor: 'listo', texto: 'Listo para publicar' },
  { valor: 'publicado', texto: 'Publicado' },
  { valor: 'archivado', texto: 'Archivado' },
];

export const TIPOS_ACTIVACION = [
  { valor: 'popup', texto: 'Pop-up' },
  { valor: 'degustacion', texto: 'Degustación' },
  { valor: 'evento', texto: 'Evento' },
  { valor: 'feria', texto: 'Feria' },
  { valor: 'alianza', texto: 'Alianza' },
];

export const ESTADOS_ACTIVACION = [
  { valor: 'planificada', texto: 'Planificada' },
  { valor: 'confirmada', texto: 'Confirmada' },
  { valor: 'realizada', texto: 'Realizada' },
  { valor: 'cancelada', texto: 'Cancelada' },
];

export const ESTADOS_EMBAJADOR = [
  { valor: 'activo', texto: 'Activo' },
  { valor: 'pausado', texto: 'Pausado' },
  { valor: 'retirado', texto: 'Retirado' },
];
