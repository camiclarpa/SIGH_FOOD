// =============================================================================
// Web Push: firmar y cifrar
// =============================================================================
//
// Mandar una notificación push a un navegador exige dos cosas que no se parecen
// en nada y se confunden constantemente:
//
//   · VAPID — una firma que dice al servicio de push (Google, Apple, Mozilla)
//     "esta notificación la manda quien dice ser". Es una cabecera. Identifica
//     al SERVIDOR.
//
//   · RFC 8291 — el cifrado del contenido, para que el servicio de push
//     transporte el mensaje sin poder leerlo. Es el cuerpo. Protege al USUARIO.
//
// Las dos son obligatorias y usan curvas distintas para cosas distintas: VAPID
// firma con NUESTRA clave permanente; el cifrado usa una clave EFÍMERA nueva en
// cada mensaje, combinada con la del dispositivo.
//
// POR QUÉ ESTÁ ESCRITO A MANO Y NO SE USA `web-push`
// --------------------------------------------------
// La librería `web-push` de npm depende del módulo `crypto` de Node. Esto se
// ejecuta en Cloudflare Workers, donde ese módulo no existe: solo hay Web
// Crypto. No es una preferencia — la librería sencillamente no arranca ahí.
//
// Todo lo de abajo usa exclusivamente `crypto.subtle`, que es idéntico en
// Workers, en el navegador y en Node 18+. Por eso se puede probar con vitest y
// desplegar sin cambiar una línea.
//
// LA PARTE QUE MÁS SE EQUIVOCA
// ----------------------------
// El orden de las claves en `key_info`. La especificación dice:
//
//     "WebPush: info" || 0x00 || clave_del_dispositivo || clave_efímera_nuestra
//
// Invertir esos dos últimos produce un cifrado perfectamente válido que ningún
// navegador puede descifrar, y el servicio de push responde 201 Created igual.
// Es decir: parece que funciona, no llega nada, y no hay ningún error que mirar.
// De ahí que las pruebas de este módulo descifren lo que acaban de cifrar.

// -----------------------------------------------------------------------------
// Base64 URL-safe
// -----------------------------------------------------------------------------
//
// Todo el mundo en Web Push habla base64url: sin '+', sin '/' y sin '=' al
// final. Mezclarlo con base64 normal da errores de "clave inválida" que apuntan
// a cualquier sitio menos aquí.

export function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deBase64Url(texto: string): Uint8Array {
  // El relleno se restaura antes de decodificar: atob lo exige y base64url lo
  // omite, así que una clave llegada del navegador falla sin esto.
  const normal = texto.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = normal + '='.repeat((4 - (normal.length % 4)) % 4);
  const binario = atob(relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function concatenar(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const salida = new Uint8Array(total);
  let offset = 0;
  for (const p of partes) {
    salida.set(p, offset);
    offset += p.length;
  }
  return salida;
}

const utf8 = (s: string) => new TextEncoder().encode(s);

// -----------------------------------------------------------------------------
// HKDF
// -----------------------------------------------------------------------------

/**
 * Un paso de HKDF-Expand con SHA-256.
 *
 * Se implementa a mano en vez de usar el HKDF de Web Crypto porque aquí siempre
 * se necesita UNA sola iteración (todas las salidas son de 32 bytes o menos), y
 * la especificación de Web Push define los `info` con un 0x01 final explícito.
 * Usar el HKDF del navegador obligaría a reconstruir ese detalle igualmente.
 */
async function hmacSha256(clave: Uint8Array, datos: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    clave as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, datos as BufferSource));
}

/** HKDF completo: extrae con la sal y expande con el info. */
async function hkdf(
  sal: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  longitud: number
): Promise<Uint8Array> {
  const prk = await hmacSha256(sal, ikm);
  // El 0x01 es el contador de bloque de HKDF-Expand. Con una sola iteración
  // siempre vale uno.
  const salida = await hmacSha256(prk, concatenar(info, new Uint8Array([1])));
  return salida.slice(0, longitud);
}

// -----------------------------------------------------------------------------
// Claves VAPID
// -----------------------------------------------------------------------------

export interface ClavesVapid {
  /** 65 bytes sin comprimir (0x04 ‖ X ‖ Y), en base64url. Va al navegador. */
  publica: string;
  /** El escalar privado de 32 bytes, en base64url. Es un SECRETO. */
  privada: string;
}

/**
 * Genera un par de claves VAPID nuevo.
 *
 * Se hace UNA vez en la vida del proyecto. Cambiarlas invalida todas las
 * suscripciones existentes: el navegador ató cada suscripción a la clave pública
 * con la que se creó, y con otra distinta el servicio de push responde 403.
 * Es decir, rotarlas equivale a perder a todos los suscriptores.
 */
export async function generarClavesVapid(): Promise<ClavesVapid> {
  const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey);
  return { publica: aBase64Url(publica), privada: jwk.d! };
}

/**
 * Reconstruye la clave privada para firmar.
 *
 * Web Crypto no importa un escalar privado suelto: necesita el JWK completo, con
 * las coordenadas públicas. Se sacan de la clave pública, que son sus bytes 1-32
 * (X) y 33-64 (Y) — el byte 0 es el 0x04 que marca "sin comprimir".
 */
async function importarPrivadaVapid(claves: ClavesVapid): Promise<CryptoKey> {
  const pub = deBase64Url(claves.publica);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('La clave pública VAPID debe ser un punto sin comprimir de 65 bytes');
  }

  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: claves.privada,
      x: aBase64Url(pub.slice(1, 33)),
      y: aBase64Url(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Firma el JWT de VAPID que autoriza este envío.
 *
 * `aud` es el ORIGEN del endpoint, no el endpoint entero. Mandar la URL completa
 * hace que el servicio de push devuelva 401 sin más explicación.
 */
export async function firmaVapid(datos: {
  endpoint: string;
  claves: ClavesVapid;
  /** Un contacto por si el servicio de push necesita avisar de un problema. */
  contacto: string;
  /** Validez en segundos. Máximo 24 h por especificación. */
  validezSegundos?: number;
}): Promise<string> {
  const origen = new URL(datos.endpoint).origin;

  const cabecera = { typ: 'JWT', alg: 'ES256' };
  const cuerpo = {
    aud: origen,
    exp: Math.floor(Date.now() / 1000) + (datos.validezSegundos ?? 12 * 3600),
    sub: datos.contacto,
  };

  const sinFirmar = `${aBase64Url(utf8(JSON.stringify(cabecera)))}.${aBase64Url(
    utf8(JSON.stringify(cuerpo))
  )}`;

  const clave = await importarPrivadaVapid(datos.claves);
  // Web Crypto devuelve la firma ECDSA como r‖s en crudo, que es justo el
  // formato de JWS. La otra codificación posible —DER— la rechazan los servicios
  // de push, y es el formato que devuelven casi todas las librerías de servidor.
  const firma = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clave, utf8(sinFirmar))
  );

  return `${sinFirmar}.${aBase64Url(firma)}`;
}

// -----------------------------------------------------------------------------
// Cifrado del contenido (RFC 8291, aes128gcm)
// -----------------------------------------------------------------------------

export interface ClavesDispositivo {
  /** `p256dh` de la suscripción: la clave pública del navegador, base64url. */
  p256dh: string;
  /** `auth` de la suscripción: 16 bytes de secreto compartido, base64url. */
  auth: string;
}

/** Tamaño de registro. 4096 es lo que usa todo el mundo y lo que aceptan todos. */
const TAMANO_REGISTRO = 4096;

/**
 * Cifra el contenido de una notificación para un dispositivo concreto.
 *
 * El resultado es el cuerpo completo que va en el POST, con su cabecera propia:
 *
 *     sal(16) ‖ tamaño(4) ‖ longitud_clave(1) ‖ clave_efímera(65) ‖ cifrado
 *
 * La clave efímera viaja DENTRO del cuerpo, no en una cabecera. En la versión
 * anterior del estándar (aesgcm) iba aparte, y mezclar los dos formatos es la
 * causa habitual de que el navegador reciba la notificación y no pueda abrirla.
 */
export async function cifrarPayload(
  texto: string,
  dispositivo: ClavesDispositivo,
  /** Solo para las pruebas: fija la sal y la clave efímera. Nunca en producción. */
  fijos?: { sal?: Uint8Array; par?: CryptoKeyPair }
): Promise<Uint8Array> {
  const clavePublicaDispositivo = deBase64Url(dispositivo.p256dh);
  const secretoAuth = deBase64Url(dispositivo.auth);

  // Un par EFÍMERO por mensaje. Reutilizarlo entre envíos permitiría a quien
  // observe el tráfico relacionar notificaciones del mismo destinatario.
  const par =
    fijos?.par ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair);

  const clavePublicaNuestra = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));

  const claveDispositivo = await crypto.subtle.importKey(
    'raw',
    clavePublicaDispositivo as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // El secreto compartido ECDH: la coordenada X del punto común, 32 bytes.
  const compartido = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: claveDispositivo },
      par.privateKey,
      256
    )
  );

  /*
    EL ORDEN DE ESTAS DOS CLAVES ES LO QUE MÁS SE EQUIVOCA.

    Primero la del DISPOSITIVO, después la NUESTRA. Al revés se obtiene un
    cifrado válido que ningún navegador puede abrir, y el servicio de push
    responde 201 igual: parece que funciona y no llega nada.
  */
  const infoClave = concatenar(
    utf8('WebPush: info'),
    new Uint8Array([0]),
    clavePublicaDispositivo,
    clavePublicaNuestra
  );

  // El `auth` del dispositivo hace de sal en este primer paso.
  const ikm = await hkdf(secretoAuth, compartido, infoClave, 32);

  const sal = fijos?.sal ?? crypto.getRandomValues(new Uint8Array(16));

  const cek = await hkdf(sal, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const claveAes = await crypto.subtle.importKey('raw', cek as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

  // El 0x02 marca "este es el último registro". Con 0x01 el navegador espera
  // otro registro que nunca llega y descarta la notificación entera.
  const plano = concatenar(utf8(texto), new Uint8Array([2]));

  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, claveAes, plano as BufferSource)
  );

  // Cabecera del formato aes128gcm.
  const tamano = new Uint8Array(4);
  new DataView(tamano.buffer).setUint32(0, TAMANO_REGISTRO, false); // big endian

  return concatenar(
    sal,
    tamano,
    new Uint8Array([clavePublicaNuestra.length]),
    clavePublicaNuestra,
    cifrado
  );
}

/**
 * Descifra lo que produce `cifrarPayload`. Solo se usa en las pruebas.
 *
 * Está aquí y no en el archivo de pruebas por una razón concreta: es la única
 * forma de comprobar que el cifrado es correcto sin un navegador de verdad. Un
 * servicio de push acepta con 201 un cuerpo mal cifrado, así que la única señal
 * fiable es que el descifrado devuelva el texto original.
 */
export async function descifrarPayload(
  cuerpo: Uint8Array,
  privadaDispositivo: CryptoKey,
  publicaDispositivo: Uint8Array,
  secretoAuth: Uint8Array
): Promise<string> {
  const sal = cuerpo.slice(0, 16);
  const longitudClave = cuerpo[20];
  const clavePublicaEmisor = cuerpo.slice(21, 21 + longitudClave);
  const cifrado = cuerpo.slice(21 + longitudClave);

  const claveEmisor = await crypto.subtle.importKey(
    'raw',
    clavePublicaEmisor as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const compartido = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: claveEmisor }, privadaDispositivo, 256)
  );

  const infoClave = concatenar(
    utf8('WebPush: info'),
    new Uint8Array([0]),
    publicaDispositivo,
    clavePublicaEmisor
  );

  const ikm = await hkdf(secretoAuth, compartido, infoClave, 32);
  const cek = await hkdf(sal, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(sal, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const claveAes = await crypto.subtle.importKey('raw', cek as BufferSource, { name: 'AES-GCM' }, false, [
    'decrypt',
  ]);

  const plano = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, claveAes, cifrado as BufferSource)
  );

  // Se quita el delimitador de relleno del final.
  let fin = plano.length;
  while (fin > 0 && plano[fin - 1] === 0) fin--;
  return new TextDecoder().decode(plano.slice(0, fin - 1));
}
