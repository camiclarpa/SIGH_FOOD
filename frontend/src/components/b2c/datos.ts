/**
 * ============================================================================
 * Catálogo y datos de la landing B2C
 * ============================================================================
 *
 * Todo el contenido de la página vive aquí, separado de los componentes que lo
 * pintan. Cambiar un precio, añadir un sabor o corregir un horario no debería
 * exigir tocar JSX ni entender React.
 *
 * DATOS DE EJEMPLO: mientras MODO_DEMO sea `true`, la dirección, los horarios,
 * los domicilios, los testimonios y las cifras son inventados para poder ver la
 * estructura completa. La página lo advierte con un aviso en la cabecera, porque
 * el sitio ya está publicado y nadie debería creerse una reseña que no existe.
 *
 * Al sustituirlos por los reales, se pone MODO_DEMO en `false` y el aviso
 * desaparece. Todo lo que hay que cambiar está en este archivo.
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
// Modo demostración
// ---------------------------------------------------------------------------

/**
 * Con esto en `true`, la página rellena con datos DE EJEMPLO todo lo que
 * todavía no es real: testimonios, cifras, dirección, horarios y domicilios.
 *
 * Sirve para ver la estructura completa antes de tener la información. Mientras
 * está activo, la página muestra arriba un aviso fino diciendo que ese contenido
 * es de ejemplo — porque el sitio ya está publicado y alguien puede entrar hoy y
 * creerse una reseña que nadie escribió.
 *
 * CUANDO TENGAS LOS DATOS REALES: sustituye los valores de abajo y pon esto en
 * `false`. El aviso desaparece y no hay nada más que tocar.
 */
export const MODO_DEMO = true;

// ---------------------------------------------------------------------------
// Dónde estamos
// ---------------------------------------------------------------------------

/**
 * La pregunta que llega justo después del precio: "¿y dónde queda?".
 *
 * Sin una dirección concreta, quien llega desde Instagram con ganas de ir se
 * queda sin saber adónde, y ese es el momento exacto en que se pierde la venta.
 *
 * DATOS DE EJEMPLO — sustituir por los reales.
 */
export const LOCAL = {
  /** Nombre corto de la zona, para el titular. */
  zona: 'Chapinero Alto',
  direccion: 'Carrera 7 # 63-44, Local 2',
  detalle: 'A media cuadra del parque, junto a la panadería.',
  ciudad: 'Bogotá',
  /** Enlace a Google Maps. Se saca de "Compartir" en la ficha del negocio. */
  mapa: 'https://www.google.com/maps/search/?api=1&query=Carrera+7+%2363-44+Bogota',
} as const;

export const HORARIOS = [
  { dias: 'Lunes a jueves', horas: '5:00 p. m. – 11:00 p. m.' },
  { dias: 'Viernes y sábado', horas: '5:00 p. m. – 2:00 a. m.' },
  { dias: 'Domingo', horas: '4:00 p. m. – 10:00 p. m.' },
] as const;

/** Domicilios. DATOS DE EJEMPLO. */
export const DOMICILIO = {
  costoCOP: 6_000,
  minutos: '25 a 40',
  zonas: 'Chapinero, Chicó, Usaquén y Zona T',
  pedidoMinimoCOP: 32_000,
} as const;

/**
 * Ficha del producto.
 *
 * Contesta "¿es grande?" antes de que la pregunten. A 32.000 pesos por algo que
 * nadie ha visto en persona, la duda del tamaño frena más compras que el precio
 * en sí.
 */
export const FICHA = {
  altura: '14 cm',
  pesoGramos: 180,
  /** Con qué se puede comparar: dice más que los gramos. */
  equivalencia: 'Llena como una entrada generosa; dos ya son una comida.',
  minutosPreparacion: '3 a 5',
} as const;

// ---------------------------------------------------------------------------
// El box de descubrimiento
// ---------------------------------------------------------------------------

/**
 * Producto de entrada.
 *
 * Antes, cinco conos sueltos costaban exactamente lo mismo que el pack, así que
 * el pack no daba ninguna razón para elegirlo. Con descuento sí: baja la barrera
 * de la primera compra y hace que la primera experiencia sea con los cinco
 * sabores en lugar de con uno solo, que es lo que engancha.
 *
 * PRECIO DE EJEMPLO: ajústalo a tus márgenes antes de publicarlo de verdad.
 */
export const BOX = {
  nombre: 'Box Descubrimiento',
  unidades: 5,
  precioCOP: 139_900,
  /** Lo que costarían sueltos, para que se vea el ahorro. */
  precioSueltoCOP: 160_000,
} as const;

// ---------------------------------------------------------------------------
// Prueba social
// ---------------------------------------------------------------------------

export interface Testimonio {
  readonly texto: string;
  readonly autor: string;
  readonly detalle?: string;
}

/**
 * Reseñas de ejemplo.
 *
 * Solo se muestran con MODO_DEMO en `true`, y siempre junto al aviso de la
 * cabecera. En cuanto pongas las reales en TESTIMONIOS, estas desaparecen solas.
 *
 * No las publiques como verdaderas: una reseña inventada en una página en
 * producción es publicidad engañosa, y además se nota — la gente reconoce el
 * testimonio genérico y desconfía justo donde querías generar confianza.
 */
export const TESTIMONIOS_DEMO: readonly Testimonio[] = [
  {
    texto:
      'Pedí el Volcano pensando que el picante iba a taparlo todo, y no. Llega al ' +
      'final, dura poco y te deja queriendo otro. Me llevé dos.',
    autor: 'Nombre de ejemplo',
    detalle: 'Spicy Volcano',
  },
  {
    texto:
      'El de trufa es una barbaridad. Lo pedí para compartir y terminamos pidiendo ' +
      'uno cada uno, porque eso no se reparte.',
    autor: 'Nombre de ejemplo',
    detalle: 'Smoked Cheese & Truffle',
  },
  {
    texto:
      'Fui por curiosidad con el de maracuyá y anís. No entendía la mezcla hasta ' +
      'que la probé. Ahora es el único que pido.',
    autor: 'Nombre de ejemplo',
    detalle: 'Tropical Anise',
  },
];

/** Reseñas reales. Vacío hasta que las haya: en cuanto pongas una, manda sobre las de ejemplo. */
export const TESTIMONIOS: readonly Testimonio[] = [];

/** Las que se muestran: las reales si existen; si no, las de ejemplo en modo demo. */
export function testimoniosVisibles(): readonly Testimonio[] {
  if (TESTIMONIOS.length > 0) return TESTIMONIOS;
  return MODO_DEMO ? TESTIMONIOS_DEMO : [];
}

interface Cifras {
  valoracion: number | null;
  numeroResenas: number | null;
  conosServidos: number | null;
}

/** Cifras de ejemplo, solo en modo demo. */
const CIFRAS_DEMO: Cifras = { valoracion: 4.9, numeroResenas: 37, conosServidos: 1240 };

/**
 * Cifras reales. `null` significa "no contada" y la interfaz la oculta sola.
 *
 * `conosServidos` puede salir del CRM, que sí los cuenta de verdad.
 */
const CIFRAS_REALES: Cifras = { valoracion: null, numeroResenas: null, conosServidos: null };

export function cifras(): Cifras {
  return MODO_DEMO ? CIFRAS_DEMO : CIFRAS_REALES;
}

/**
 * Campaña de lanzamiento.
 *
 * Convierte la falta de reseñas en un motivo para pedir, en lugar de en un hueco
 * incómodo. Quien entra hoy no llega tarde: llega temprano, que es mejor.
 *
 * CIFRA DE EJEMPLO — pon la que lleves de verdad; sale del CRM.
 */
export const LANZAMIENTO = {
  meta: 100,
  llevamos: 38,
  incentivo: 'Un cono gratis en tu siguiente visita por contarnos qué te pareció.',
} as const;

// ---------------------------------------------------------------------------
// Preguntas
// ---------------------------------------------------------------------------

export const PREGUNTAS = [
  {
    p: '¿Dónde están?',
    r: `En ${LOCAL.direccion}, ${LOCAL.zona}, ${LOCAL.ciudad}. ${LOCAL.detalle}`,
  },
  {
    p: '¿Qué es exactamente un cono Bocazo?',
    r:
      'Una base crujiente hecha en molde, rellena al momento con crema, salsa y ' +
      'toppings. Se come con la mano, de pie, en menos de cinco minutos. No es ' +
      'un postre ni un plato: es un bocado con nombre propio.',
  },
  {
    p: '¿Qué tamaño tiene? ¿Llena?',
    r: `Mide ${FICHA.altura} y pesa unos ${FICHA.pesoGramos} gramos. ${FICHA.equivalencia}`,
  },
  {
    p: '¿Los conos llevan alcohol?',
    r:
      'No. Ninguno lleva alcohol. El licor que aparece junto a cada sabor es un ' +
      'maridaje sugerido: con qué copa combina mejor si te apetece acompañarlo. ' +
      'El cono lo puede comer cualquiera.',
  },
  {
    p: '¿Son dulces o salados?',
    r:
      'Los dos. Smoked Cheese & Truffle y Spicy Volcano son salados; Sweet & Salty ' +
      'Caramel y Tropical Anise son dulces; Herbal Citrus está en medio. Si es tu ' +
      'primera vez, empieza por el que más te llame a la vista: casi siempre acierta.',
  },
  {
    p: '¿Cuánto tarda?',
    r:
      `Se arma en el momento: ${FICHA.minutosPreparacion} minutos si vienes al local. ` +
      `A domicilio, entre ${DOMICILIO.minutos} minutos según tu zona.`,
  },
  {
    p: '¿Puedo pedir para recoger?',
    r:
      'Sí, y es lo que recomendamos. Escríbenos por WhatsApp, te confirmamos la hora ' +
      'y lo tienes listo al llegar: sin cola y recién hecho.',
  },
  {
    p: '¿Cuánto cuesta el domicilio?',
    r:
      `${precio(DOMICILIO.costoCOP)} en ${DOMICILIO.zonas}. Pedido mínimo ` +
      `${precio(DOMICILIO.pedidoMinimoCOP)}. Fuera de esas zonas, pregúntanos y te decimos.`,
  },
  {
    p: '¿Cuánto cuestan?',
    r:
      `${precio(PRECIO)} cada uno, cualquiera de los cinco. Sin sorpresas por sabor. ` +
      `El ${BOX.nombre} con los cinco sale por ${precio(BOX.precioCOP)}.`,
  },
  {
    p: '¿Tienen opciones vegetarianas?',
    r:
      'Herbal Citrus, Tropical Anise y Sweet & Salty Caramel son aptos para ' +
      'vegetarianos. Si tienes alguna alergia, escríbenos antes y te decimos ' +
      'exactamente qué lleva cada uno.',
  },
  {
    p: '¿Cómo pido?',
    r: `Por WhatsApp, al ${MARCA.whatsappVisible}. Te contestamos ahí mismo.`,
  },
] as const;
