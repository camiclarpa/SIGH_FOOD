/**
 * ============================================================================
 * Catálogo y datos de la landing B2C
 * ============================================================================
 *
 * Todo el contenido de la página vive aquí, separado de los componentes que lo
 * pintan. Cambiar un precio, añadir un sabor o corregir un horario no debería
 * exigir tocar JSX ni entender React.
 *
 * REGLA QUE NO SE PUEDE ROMPER: aquí no se inventan datos.
 *
 * Las cifras de prueba social (reseñas, número de clientes) empiezan vacías a
 * propósito. Publicar un "4.9/5 ⭐ · +2.000 clientes" que nadie ha contado no es
 * marketing: es una reseña falsa, y en Colombia la SIC sanciona la publicidad
 * engañosa. Además destruye justo lo que esa sección busca construir. Cuando
 * tengas reseñas reales, se rellenan aquí y la sección aparece sola.
 */

// ---------------------------------------------------------------------------
// Marca y contacto
// ---------------------------------------------------------------------------

export const MARCA = {
  nombre: 'Bocazo',
  /** El número real de WhatsApp Business, ya verificado en Meta. */
  whatsapp: '573160438031',
  whatsappVisible: '+57 316 0438031',
  instagram: 'bocazo.co',
  ciudad: 'Bogotá',
} as const;

/**
 * Abre WhatsApp con el mensaje ya escrito.
 *
 * El texto prerredactado importa más de lo que parece: un chat en blanco obliga
 * a la persona a decidir qué decir, y ahí es donde se cae la mitad de la gente.
 * Con el mensaje puesto, solo tiene que pulsar enviar.
 */
export function enlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${MARCA.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

// ---------------------------------------------------------------------------
// Los conos
// ---------------------------------------------------------------------------

export interface Cono {
  readonly id: string;
  readonly nombre: string;
  /** Nombre corto, para cuando el largo no cabe. */
  readonly corto: string;
  /** Lo primero que se lee. Sensación, no ficha técnica. */
  readonly gancho: string;
  readonly descripcion: string;
  /** Lo que se nota al morder, en orden. Alimenta la sección de experiencia. */
  readonly notas: readonly string[];
  readonly maridaje: readonly string[];
  readonly precioCOP: number;
  /** Ruta base sin ancho: el cargador elige la variante. */
  readonly imagen: string;
  /** Marcador borroso en base64 mientras carga la foto. */
  readonly marcador: string;
  /** Familia de sabor, para el filtro. */
  readonly familia: 'salado' | 'dulce' | 'fresco';
  readonly intensidad: 1 | 2 | 3;
}

const PRECIO = 32_000;

export const CONOS: readonly Cono[] = [
  {
    id: 'spicy-volcano',
    nombre: 'Spicy Volcano',
    corto: 'Volcano',
    gancho: 'Arde. Y vas a querer otro.',
    descripcion:
      'Elixir de chile y limón sobre una base crujiente que se rompe al primer mordisco. ' +
      'El picante llega tarde, se queda un momento y se va limpio.',
    notas: ['Crujido', 'Chile ahumado', 'Limón', 'Calor que sube'],
    maridaje: ['Mezcal', 'Tequila'],
    precioCOP: PRECIO,
    imagen: '/conos/spicy-volcano.webp',
    marcador:
      'data:image/webp;base64,UklGRrwAAABXRUJQVlA4ILAAAACQBgCdASoYAB4APt1WqEyopKQiMBgMARAbiWwAnTKEdIeCurhqwCuTYp2kgfg7c+KrMHs110W+i6mr8AAAAP7y3QoLbkmvV9K6m1KXWSC5haT/lSO4c08kAABQOqmA7z6KvXuBKRESbmjuElso2Qh4HF5mtvHIWSS+KlQzoNV7cb1KeFEuSjIB92ig5d5Sf+6hEHz3JOOPLGGKwjtOZmLUNDEAqL9ko1N9YXhAewAAAA==',
    familia: 'salado',
    intensidad: 3,
  },
  {
    id: 'smoked-cheese-truffle',
    nombre: 'Smoked Cheese & Truffle',
    corto: 'Truffle',
    gancho: 'El que convence a los que dicen que no tienen hambre.',
    descripcion:
      'Queso ahumado y trufa negra sobre una crema densa, servido tibio. ' +
      'Umami profundo, del tipo que no se olvida.',
    notas: ['Humo', 'Trufa negra', 'Queso curado', 'Sal en escamas'],
    maridaje: ['Vino tinto', 'Espumoso'],
    precioCOP: PRECIO,
    imagen: '/conos/smoked-cheese-truffle.webp',
    marcador:
      'data:image/webp;base64,UklGRqgAAABXRUJQVlA4IJwAAAAQBgCdASoYACQAPtFWpkyoJKOiMBqtUQAaCWIAtRu+Qfj28XKs17AQI7oAQws5WXBIfmkBgTdZg5gA/vWA4ZzHm97Gm1xBcHtCFwN1XsC1CrLFzcDrv9I5TrD3jBXri7KonMj3idl2BYJZFybr38iKIC9h/j2SG1PVmCbbkS8ofnDl9QcN/LctLgpBM6UzVNbQnWp2k2ZGpdNQAAA=',
    familia: 'salado',
    intensidad: 2,
  },
  {
    id: 'sweet-salty-caramel',
    nombre: 'Sweet & Salty Caramel',
    corto: 'Caramel',
    gancho: 'Dulce, salado, y un problema para tu autocontrol.',
    descripcion:
      'Caramelo salado que cae por el borde, nueces garrapiñadas y escamas de sal. ' +
      'El contraste es el punto: cada bocado alterna entre los dos.',
    notas: ['Caramelo tibio', 'Nuez tostada', 'Sal marina', 'Vainilla'],
    maridaje: ['Bourbon', 'Whisky'],
    precioCOP: PRECIO,
    imagen: '/conos/sweet-salty-caramel.webp',
    marcador:
      'data:image/webp;base64,UklGRrQAAABXRUJQVlA4IKgAAABQBgCdASoYACQAPsVSnUynpSKiNUwA8BiJZACdMyZEXxxROufqpjcR9oBVlO9Ss74yZXYC65yWswfmAAD+9qsl+xfx0JxnpUPVcSulOsFJqHm4hdkywfkzguyRqryIyGp45FSk9HwNT6tYHrG3livXxumuh1M+kWnbJUYmFVPGQDQEvypcEziYXLVBgnCBcL/2h5NJXo+sw/IOcz8FUhbByL2ISL4AAAA=',
    familia: 'dulce',
    intensidad: 2,
  },
  {
    id: 'tropical-anise',
    nombre: 'Tropical Anise',
    corto: 'Tropical',
    gancho: 'Maracuyá con anís estrellado. Suena raro. Funciona.',
    descripcion:
      'Maracuyá fresco, coco tostado y anís estrellado. ' +
      'Ácido al principio, dulce al final, con un fondo especiado que no esperas.',
    notas: ['Maracuyá', 'Coco tostado', 'Anís estrellado', 'Cítrico'],
    maridaje: ['Ron añejo'],
    precioCOP: PRECIO,
    imagen: '/conos/tropical-anise.webp',
    marcador:
      'data:image/webp;base64,UklGRuwAAABXRUJQVlA4IOAAAAAQBwCdASoYACQAPtlYokyoJSMiMBqtUQAbCWgAnTKEgJkGwW54T6iBhhFtIeOyPbfBjJI0TV7r5WHIeZgq881NAAD+8W0in+N9WaX1ydQyTQpZJT6IkTflHNvuLyvl7dB5RkJr5ttay35kLOZ8glFJWdR6VSozmsUF8MP30LaregQ6F9hWBKegE7j10Xf62C7bPXnUbA8+ZzGRw8YqvCZxuZV25PDPecNa2U4KRWcAmjVF/L+7fbQ6IwdD7ZjJyCgmkL1QZpM89U9ZMlWT8U7k8phfyW+JXigJgvVvRgAAAA==',
    familia: 'dulce',
    intensidad: 2,
  },
  {
    id: 'herbal-citrus',
    nombre: 'Herbal Citrus',
    corto: 'Citrus',
    gancho: 'El que pides cuando ya probaste los otros cuatro.',
    descripcion:
      'Crema de limón, ralladura confitada y albahaca fresca sobre una base con hierbas. ' +
      'Limpio, ligero, y sorprendentemente difícil de dejar.',
    notas: ['Limón', 'Albahaca', 'Hierbas frescas', 'Azúcar cristalizada'],
    maridaje: ['Gin-tonic'],
    precioCOP: PRECIO,
    imagen: '/conos/herbal-citrus.webp',
    marcador:
      'data:image/webp;base64,UklGRuQAAABXRUJQVlA4INgAAADQBgCdASoYACQAPtFao0yoJaMiNVv4AQAaCWoAxQeVqAAZSMLZu3W98YrujWagW5RW5Mt/HFCt9Tvvqo7pazAA/sYDwfOcW2uN07rT3jXGaEBreRAgLp8FcYhpANZkCKgvbHE4qhPVSbBWmbwYmXWh24KOfmPTd8OdKaW4GFB0jPnOHk8zN5yfrYNnBvth5en5tHyotO7ZDauUCMkIAwgVQufr0r+GjyYCTckxWKrlR5HrKLuHdWsUz3UllCgw/Tm1T0316wUH2XQEsIXO4Nuzu/dqQsjQAAA=',
    familia: 'fresco',
    intensidad: 1,
  },
] as const;

export const FAMILIAS = [
  { id: 'todos', etiqueta: 'Los cinco' },
  { id: 'salado', etiqueta: 'Salados' },
  { id: 'dulce', etiqueta: 'Dulces' },
  { id: 'fresco', etiqueta: 'Frescos' },
] as const;

/** Precio en pesos, como se escribe en Colombia. */
export function precio(cop: number): string {
  return `$${cop.toLocaleString('es-CO')}`;
}

// ---------------------------------------------------------------------------
// Prueba social
// ---------------------------------------------------------------------------

export interface Testimonio {
  readonly texto: string;
  readonly autor: string;
  readonly detalle?: string;
}

/**
 * Reseñas reales. Vacío hasta que las haya.
 *
 * No se rellena con ejemplos: un testimonio inventado en una página publicada es
 * una reseña falsa, y la sección está construida para verse bien vacía. Cuando
 * tengas las primeras, se pegan aquí y aparecen solas.
 */
export const TESTIMONIOS: readonly Testimonio[] = [];

/**
 * Cifras verificables. `null` mientras no estén contadas de verdad.
 *
 * Cada una se oculta sola si es null, así que la sección nunca enseña un hueco
 * ni un número inventado.
 */
export const CIFRAS = {
  /** Puntuación media, si tienes reseñas en Google o Instagram. */
  valoracion: null as number | null,
  /** Cuántas reseñas la respaldan. Sin esto, la nota no significa nada. */
  numeroResenas: null as number | null,
  /** Conos servidos. Sale del CRM: es un dato que sí puedes contar. */
  conosServidos: null as number | null,
} as const;

// ---------------------------------------------------------------------------
// Preguntas
// ---------------------------------------------------------------------------

export const PREGUNTAS = [
  {
    p: '¿Qué es exactamente un cono Bocazo?',
    r: 'Una base crujiente hecha en molde, rellena al momento con crema, salsa y ' +
       'toppings. Se come con la mano, de pie, en menos de cinco minutos. No es ' +
       'un postre ni un plato: es un bocado con nombre propio.',
  },
  {
    p: '¿Son dulces o salados?',
    r: 'Los dos. Smoked Cheese & Truffle y Spicy Volcano son salados; Sweet & Salty ' +
       'Caramel y Tropical Anise son dulces; Herbal Citrus está en medio. Si es tu ' +
       'primera vez, empieza por el que más te llame a la vista — casi siempre acierta.',
  },
  {
    p: '¿Se preparan al momento?',
    r: 'Sí. El relleno entra cuando pides, no antes. Por eso la base sigue crujiente ' +
       'cuando llega a tu mano, que es la mitad de la gracia.',
  },
  {
    p: '¿Cuánto cuestan?',
    r: `${precio(PRECIO)} cada uno, cualquiera de los cinco. Sin sorpresas por sabor.`,
  },
  {
    p: '¿Hacen domicilios?',
    r: 'Escríbenos por WhatsApp y te confirmamos cobertura y tiempo según tu zona. ' +
       'Aviso honesto: el cono está en su mejor momento recién servido, así que si ' +
       'puedes venir, ven.',
  },
  {
    p: '¿Tienen opciones vegetarianas?',
    r: 'Herbal Citrus, Tropical Anise y Sweet & Salty Caramel son aptos para ' +
       'vegetarianos. Si tienes alguna alergia, escríbenos antes y te decimos ' +
       'exactamente qué lleva cada uno.',
  },
  {
    p: '¿Puedo pedir varios para compartir?',
    r: 'Es lo que hace casi todo el mundo. Pide los cinco y repartid: es la forma ' +
       'más rápida de descubrir cuál es el tuyo.',
  },
  {
    p: '¿Cómo pido?',
    r: 'Por WhatsApp, al ' + MARCA.whatsappVisible + '. Te contestamos ahí mismo.',
  },
] as const;
