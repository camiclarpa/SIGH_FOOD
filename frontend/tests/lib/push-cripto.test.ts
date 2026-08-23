// =============================================================================
// Web Push: firma y cifrado
// =============================================================================
//
// Por qué estas pruebas existen y por qué descifran lo que acaban de cifrar:
//
// Un servicio de push (Google, Apple, Mozilla) responde 201 Created a un cuerpo
// MAL CIFRADO. No lo mira: solo lo transporta. El único que descubre el error es
// el navegador del destinatario, que descarta la notificación en silencio.
//
// Es decir: con el cifrado roto, el servidor cree que envió, el servicio de push
// confirma, las métricas dicen "entregado" y al comensal no le llega nada. No
// hay ningún error en ningún registro.
//
// La única comprobación que vale es la de aquí abajo: generar un par de claves
// como el que crearía un navegador, cifrar, y volver a descifrar con la clave
// privada de ese "navegador". Si el texto vuelve intacto, el formato es correcto.

import { describe, it, expect } from 'vitest';
import {
  aBase64Url,
  deBase64Url,
  cifrarPayload,
  descifrarPayload,
  firmaVapid,
  generarClavesVapid,
} from '../../packages/sighfood-domain/src/lib/push-cripto';

/** Simula lo que hace el navegador al suscribirse: un par ECDH y 16 bytes de auth. */
async function dispositivoDePrueba() {
  const par = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;

  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  return {
    privada: par.privateKey,
    publica,
    auth,
    suscripcion: { p256dh: aBase64Url(publica), auth: aBase64Url(auth) },
  };
}

describe('base64url', () => {
  it('va y vuelve sin perder nada', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(65));
    expect(deBase64Url(aBase64Url(bytes))).toEqual(bytes);
  });

  it('no usa los caracteres que rompen una URL', () => {
    // Con '+' o '/' la clave viaja mal en una cabecera y el servicio de push
    // responde 401 sin decir por qué.
    const texto = aBase64Url(new Uint8Array([251, 255, 254, 62, 63]));
    expect(texto).not.toMatch(/[+/=]/);
  });

  it('acepta lo que manda el navegador, que viene sin relleno', () => {
    // El navegador entrega las claves sin '=' al final; atob las rechaza tal cual.
    expect(() => deBase64Url('BOrq3gVLZ0Q')).not.toThrow();
  });
});

describe('cifrado del contenido', () => {
  it('el navegador puede volver a leer lo que ciframos', async () => {
    // LA PRUEBA QUE IMPORTA. Todo lo demás de este archivo puede pasar con un
    // cifrado inservible; esto no.
    const d = await dispositivoDePrueba();
    const mensaje = JSON.stringify({ titulo: 'Tu pedido va en camino', cuerpo: 'BZ-ABC123' });

    const cuerpo = await cifrarPayload(mensaje, d.suscripcion);
    const recuperado = await descifrarPayload(cuerpo, d.privada, d.publica, d.auth);

    expect(recuperado).toBe(mensaje);
  });

  it('funciona con acentos y emoji', async () => {
    // El cuerpo se mide en BYTES, no en caracteres: una ñ ocupa dos y un emoji
    // cuatro. Un cálculo de longitud hecho sobre caracteres corta el mensaje.
    const d = await dispositivoDePrueba();
    const mensaje = 'Subiste de nivel 🌶 ¡ya eres Catador! Añade tu reseña';

    const cuerpo = await cifrarPayload(mensaje, d.suscripcion);
    expect(await descifrarPayload(cuerpo, d.privada, d.publica, d.auth)).toBe(mensaje);
  });

  it('cada mensaje sale distinto aunque el texto sea el mismo', async () => {
    // Sal y clave efímera nuevas por envío. Si dos mensajes iguales produjeran el
    // mismo cuerpo, quien observe el tráfico sabría que se repitió la campaña.
    const d = await dispositivoDePrueba();
    const a = await cifrarPayload('hola', d.suscripcion);
    const b = await cifrarPayload('hola', d.suscripcion);
    expect(aBase64Url(a)).not.toBe(aBase64Url(b));
  });

  it('respeta la cabecera del formato aes128gcm', async () => {
    const d = await dispositivoDePrueba();
    const cuerpo = await cifrarPayload('x', d.suscripcion);

    // sal(16) ‖ tamaño(4) ‖ longitud(1) ‖ clave(65) ‖ cifrado
    expect(cuerpo.length).toBeGreaterThan(86);
    expect(cuerpo[20]).toBe(65); // la clave efímera sin comprimir mide 65
    expect(cuerpo[21]).toBe(0x04); // y empieza por 0x04

    const tamano = new DataView(cuerpo.buffer, cuerpo.byteOffset + 16, 4).getUint32(0, false);
    expect(tamano).toBe(4096);
  });

  it('el orden de las claves en key_info no es intercambiable', async () => {
    // Cifrar con el orden invertido produce algo que el dispositivo NO puede
    // leer. Se comprueba descifrando con las claves cambiadas de sitio: tiene
    // que fallar. Si pasara, el orden daría igual y no sería así.
    const d = await dispositivoDePrueba();
    const cuerpo = await cifrarPayload('secreto', d.suscripcion);

    const clavePublicaEmisor = cuerpo.slice(21, 86);
    await expect(
      // Se le pasa la clave del emisor donde va la del dispositivo.
      descifrarPayload(cuerpo, d.privada, clavePublicaEmisor, d.auth)
    ).rejects.toThrow();
  });

  it('un auth distinto no descifra', async () => {
    const d = await dispositivoDePrueba();
    const cuerpo = await cifrarPayload('secreto', d.suscripcion);
    const otroAuth = crypto.getRandomValues(new Uint8Array(16));
    await expect(descifrarPayload(cuerpo, d.privada, d.publica, otroAuth)).rejects.toThrow();
  });
});

describe('firma VAPID', () => {
  it('genera un par utilizable', async () => {
    const claves = await generarClavesVapid();
    const publica = deBase64Url(claves.publica);
    expect(publica.length).toBe(65);
    expect(publica[0]).toBe(0x04);
    expect(deBase64Url(claves.privada).length).toBe(32);
  });

  it('produce un JWT de tres partes', async () => {
    const claves = await generarClavesVapid();
    const jwt = await firmaVapid({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      claves,
      contacto: 'mailto:hola@bocazo.co',
    });
    expect(jwt.split('.')).toHaveLength(3);
  });

  it('la audiencia es el ORIGEN, no el endpoint entero', async () => {
    // Mandar la URL completa hace que el servicio de push devuelva 401 sin
    // explicar nada. Es el fallo clásico de esta cabecera.
    const claves = await generarClavesVapid();
    const jwt = await firmaVapid({
      endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAA-token-largo',
      claves,
      contacto: 'mailto:hola@bocazo.co',
    });

    const cuerpo = JSON.parse(new TextDecoder().decode(deBase64Url(jwt.split('.')[1])));
    expect(cuerpo.aud).toBe('https://updates.push.services.mozilla.com');
    expect(cuerpo.aud).not.toContain('wpush');
  });

  it('la firma es r‖s en crudo, no DER', async () => {
    // JWS exige 64 bytes planos. DER —lo que devuelven casi todas las librerías
    // de servidor— empieza por 0x30 y lo rechazan los servicios de push.
    const claves = await generarClavesVapid();
    const jwt = await firmaVapid({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      claves,
      contacto: 'mailto:hola@bocazo.co',
    });
    const firma = deBase64Url(jwt.split('.')[2]);
    expect(firma.length).toBe(64);
  });

  it('la firma la puede verificar la clave pública', async () => {
    const claves = await generarClavesVapid();
    const jwt = await firmaVapid({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      claves,
      contacto: 'mailto:hola@bocazo.co',
    });

    const [cabecera, cuerpo, firma] = jwt.split('.');
    const publica = await crypto.subtle.importKey(
      'raw',
      deBase64Url(claves.publica) as BufferSource,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const valida = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publica,
      deBase64Url(firma) as BufferSource,
      new TextEncoder().encode(`${cabecera}.${cuerpo}`)
    );
    expect(valida).toBe(true);
  });

  it('caduca, y en menos de 24 horas', async () => {
    // La especificación no acepta más de un día. Un JWT sin caducidad o con una
    // muy larga lo rechazan algunos servicios.
    const claves = await generarClavesVapid();
    const jwt = await firmaVapid({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      claves,
      contacto: 'mailto:hola@bocazo.co',
    });
    const cuerpo = JSON.parse(new TextDecoder().decode(deBase64Url(jwt.split('.')[1])));
    const ahora = Math.floor(Date.now() / 1000);
    expect(cuerpo.exp).toBeGreaterThan(ahora);
    expect(cuerpo.exp).toBeLessThanOrEqual(ahora + 24 * 3600);
  });
});
