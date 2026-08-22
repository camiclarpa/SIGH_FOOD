// =============================================================================
// Wompi: firmas, importes y checkout
// =============================================================================
//
// Dos firmas distintas, y confundirlas es el error clásico de esta integración:
//
//   · INTEGRIDAD — la calculamos NOSOTROS y viaja con el checkout. Le dice a
//     Wompi "este importe y esta referencia salen de mí". Sin ella, cualquiera
//     podría abrir el checkout con el mismo enlace cambiando el monto a mil
//     pesos.
//
//   · EVENTOS — la calcula WOMPI y la verificamos nosotros al recibir el
//     webhook. Dice "este aviso de pago aprobado lo mandé yo". Sin verificarla,
//     quien conozca la URL manda un "APPROVED" falso y se lleva comida gratis.
//
// Los dos secretos son distintos y no son intercambiables. Usar uno donde va el
// otro produce firmas que nunca cuadran, y el síntoma —"todos los pagos se
// rechazan"— no apunta a la causa.
//
// SOBRE LOS IMPORTES
// ------------------
// Wompi trabaja en CENTAVOS. El peso colombiano no usa decimales en la calle,
// pero la API sí: 32.000 COP son 3.200.000 centavos. Equivocarse aquí no da un
// error, da un cobro cien veces mayor o menor — y eso se descubre cuadrando
// caja, no en pruebas. Por eso la conversión vive en una sola función y los
// importes se guardan en centavos tal como los devuelve la pasarela.

import { variableDeEntorno } from '@/lib/cloudflare';

export interface ConfigWompi {
  llavePublica: string;
  secretoIntegridad: string;
  secretoEventos: string;
  /** true si las llaves son de sandbox (pub_test_/prv_test_). */
  pruebas: boolean;
  urlCheckout: string;
}

export type EstadoConfig =
  | { listo: true; config: ConfigWompi }
  | { listo: false; faltan: string[]; motivo: string };

/**
 * Lee la configuración por petición, no al importar el módulo.
 *
 * En Workers las variables llegan por el binding `env` y `process.env` está
 * vacío en el ámbito global. Una constante de módulo valdría `undefined` para
 * siempre — el mismo error que dejó a la integración de WhatsApp sin
 * credenciales durante semanas.
 */
export async function configWompi(): Promise<EstadoConfig> {
  const [llavePublica, secretoIntegridad, secretoEventos] = await Promise.all([
    variableDeEntorno('WOMPI_PUBLIC_KEY'),
    variableDeEntorno('WOMPI_INTEGRITY_SECRET'),
    variableDeEntorno('WOMPI_EVENTS_SECRET'),
  ]);

  const faltan: string[] = [];
  if (!llavePublica?.trim()) faltan.push('WOMPI_PUBLIC_KEY');
  if (!secretoIntegridad?.trim()) faltan.push('WOMPI_INTEGRITY_SECRET');
  if (!secretoEventos?.trim()) faltan.push('WOMPI_EVENTS_SECRET');

  if (faltan.length > 0) {
    return {
      listo: false,
      faltan,
      motivo:
        `Faltan ${faltan.length} variable${faltan.length === 1 ? '' : 's'} de Wompi. ` +
        'Se suben con `node scripts/configurar-wompi.mjs`.',
    };
  }

  const publica = llavePublica!.trim();
  // Las llaves de sandbox llevan _test_. Detectarlo aquí evita el peor error
  // posible: creer que estás probando y estar cobrando de verdad.
  const pruebas = publica.includes('_test_');

  return {
    listo: true,
    config: {
      llavePublica: publica,
      secretoIntegridad: secretoIntegridad!.trim(),
      secretoEventos: secretoEventos!.trim(),
      pruebas,
      // Wompi usa el mismo host para los dos entornos: lo que separa sandbox de
      // producción es la llave, no la URL.
      urlCheckout: 'https://checkout.wompi.co/p/',
    },
  };
}

// -----------------------------------------------------------------------------
// Importes
// -----------------------------------------------------------------------------

/**
 * Pesos a centavos.
 *
 * La única conversión que existe. Está aislada a propósito: un factor mal
 * puesto no lanza ningún error, simplemente cobra cien veces de más o de menos,
 * y eso solo se descubre cuadrando caja.
 */
export function aCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Centavos a pesos. Para comparar contra el total del pedido. */
export function aPesos(centavos: number): number {
  return Math.round(centavos / 100);
}

// -----------------------------------------------------------------------------
// Firmas
// -----------------------------------------------------------------------------

/** SHA-256 en hexadecimal. Web Crypto: igual en Workers que en Node. */
async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Firma de integridad para el checkout.
 *
 * Wompi la define como SHA-256 de la concatenación EN ESTE ORDEN:
 *
 *   referencia + monto_en_centavos + moneda + secreto_de_integridad
 *
 * El orden no es negociable y no lleva separadores. Cambiar cualquier cosa
 * —incluido un espacio— produce una firma que Wompi rechaza con "La firma es
 * inválida", sin decir en qué.
 */
export async function firmaIntegridad(datos: {
  referencia: string;
  montoCentavos: number;
  moneda: string;
  secreto: string;
}): Promise<string> {
  return sha256(`${datos.referencia}${datos.montoCentavos}${datos.moneda}${datos.secreto}`);
}

/** Lo que manda Wompi en el webhook. Solo lo que se usa. */
export interface EventoWompi {
  event: string;
  data: {
    transaction?: {
      id: string;
      status: string;
      reference: string;
      amount_in_cents: number;
      currency?: string;
      payment_method_type?: string;
      status_message?: string | null;
      finalized_at?: string | null;
    };
  };
  timestamp: number;
  signature: { properties: string[]; checksum: string };
  environment?: string;
  sent_at?: string;
}

/** Lee un valor por su ruta con puntos: "transaction.id" → data.transaction.id */
function porRuta(objeto: unknown, ruta: string): string {
  let actual: unknown = objeto;
  for (const parte of ruta.split('.')) {
    if (actual === null || typeof actual !== 'object') return '';
    actual = (actual as Record<string, unknown>)[parte];
  }
  return actual === null || actual === undefined ? '' : String(actual);
}

/**
 * Comprueba que el evento viene de Wompi.
 *
 * Wompi firma concatenando, EN EL ORDEN QUE ÉL MISMO INDICA en
 * `signature.properties`, los valores de esas propiedades dentro de `data`, más
 * el timestamp, más el secreto de eventos.
 *
 * Se recorre la lista que manda Wompi en lugar de una fija nuestra: la lista
 * puede cambiar entre tipos de evento, y fijarla aquí haría que un evento nuevo
 * fallara la firma sin motivo aparente.
 *
 * Sin esta comprobación el endpoint es público y cualquiera puede mandar un
 * "APPROVED" inventado. Es la única cosa de todo el archivo que, si falla,
 * regala producto.
 */
export async function firmaEventoValida(
  evento: EventoWompi,
  secretoEventos: string
): Promise<boolean> {
  const props = evento?.signature?.properties;
  const checksum = evento?.signature?.checksum;

  if (!Array.isArray(props) || props.length === 0 || !checksum) return false;
  if (!evento.timestamp) return false;

  const concatenado = props.map((p) => porRuta(evento.data, p)).join('');
  const esperado = await sha256(`${concatenado}${evento.timestamp}${secretoEventos}`);

  // Comparación en tiempo constante: un `===` sobre cadenas filtra por cuánto
  // tarda en fallar y permite reconstruir el checksum byte a byte.
  const a = esperado.toLowerCase();
  const b = String(checksum).toLowerCase();
  if (a.length !== b.length) return false;

  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

// -----------------------------------------------------------------------------
// Estados
// -----------------------------------------------------------------------------

/** Estados que devuelve Wompi, traducidos a los nuestros. */
export function traducirEstado(estadoWompi: string): 'aprobado' | 'rechazado' | 'pendiente' {
  switch (estadoWompi?.toUpperCase()) {
    case 'APPROVED':
      return 'aprobado';
    case 'DECLINED':
    case 'ERROR':
    case 'VOIDED':
      return 'rechazado';
    // PENDING y cualquier estado que Wompi añada en el futuro se tratan como
    // pendiente: es el único valor seguro. Dar por aprobado algo que no se
    // reconoce entrega producto sin cobrar.
    default:
      return 'pendiente';
  }
}

/** Qué métodos de pago pasan por Wompi. El resto se cobran en mano. */
export const METODOS_WOMPI = ['tarjeta', 'pse', 'nequi'] as const;

export function pasaPorWompi(metodo: string): boolean {
  return (METODOS_WOMPI as readonly string[]).includes(metodo);
}

/**
 * Arma la URL del Web Checkout de Wompi.
 *
 * Se usa el checkout alojado y no un formulario propio a propósito: con el
 * formulario propio, los datos de la tarjeta pasan por nuestro servidor y eso
 * arrastra el alcance completo de PCI-DSS. Con el checkout alojado, la tarjeta
 * nunca toca nuestra infraestructura.
 */
export function urlCheckout(datos: {
  config: ConfigWompi;
  referencia: string;
  montoCentavos: number;
  firma: string;
  urlRetorno: string;
  telefono?: string;
  nombre?: string;
}): string {
  const p = new URLSearchParams({
    'public-key': datos.config.llavePublica,
    currency: 'COP',
    'amount-in-cents': String(datos.montoCentavos),
    reference: datos.referencia,
    'signature:integrity': datos.firma,
    'redirect-url': datos.urlRetorno,
  });

  // Prerellenar ahorra teclear en el móvil, que es donde se abandona.
  if (datos.nombre) p.set('customer-data:full-name', datos.nombre);
  if (datos.telefono) {
    p.set('customer-data:phone-number', datos.telefono.replace(/^57/, ''));
    p.set('customer-data:phone-number-prefix', '+57');
  }

  return `${datos.config.urlCheckout}?${p}`;
}
