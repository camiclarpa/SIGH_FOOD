// =============================================================================
// El envío de una notificación, contra un servidor de verdad
// =============================================================================
//
// Las pruebas de push-cripto.test.ts comprueban que el cifrado es correcto. Esto
// comprueba lo siguiente: que la PETICIÓN que sale por el cable es la que un
// servicio de push acepta, y que su respuesta se interpreta bien.
//
// Se levanta un servidor HTTP local que hace de Google/Apple/Mozilla: recibe el
// POST, mira las cabeceras y DESCIFRA el cuerpo con la clave privada del
// "dispositivo". Si el texto vuelve intacto, el mensaje habría llegado.
//
// POR QUÉ IMPORTA LA PARTE DE LOS CÓDIGOS DE ERROR
// ------------------------------------------------
// Un 410 significa "esta suscripción ya no existe" y hay que darla de baja. Un
// 500 significa "mi servidor está mal" y NO hay que tocarla. Confundirlos tiene
// una consecuencia concreta y difícil de deshacer: una caída de una hora en el
// servicio de push borraría a media base de suscriptores, y no hay forma de
// recuperarlos — el canal para pedirles que vuelvan a suscribirse es justo el
// que se acaba de perder.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { enviarADispositivo } from '../../apps/web/src/lib/push';
import {
  aBase64Url,
  deBase64Url,
  descifrarPayload,
  generarClavesVapid,
  type ClavesVapid,
} from '../../packages/sighfood-domain/src/lib/push-cripto';

/** Lo que el servidor de mentira apunta de cada petición que recibe. */
interface Recibido {
  metodo: string;
  cabeceras: Record<string, string>;
  cuerpo: Buffer;
}

let servidor: Server;
let base: string;
let recibido: Recibido | null = null;
/** Qué código devolver en la siguiente petición. */
let responder = 201;

let vapid: ClavesVapid;
let dispositivo: {
  privada: CryptoKey;
  publica: Uint8Array;
  auth: Uint8Array;
  p256dhB64: string;
  authB64: string;
};

beforeAll(async () => {
  vapid = await generarClavesVapid();

  // Un par ECDH como el que crea un navegador al suscribirse.
  const par = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  dispositivo = {
    privada: par.privateKey,
    publica,
    auth,
    p256dhB64: aBase64Url(publica),
    authB64: aBase64Url(auth),
  };

  servidor = createServer((req, res) => {
    const trozos: Buffer[] = [];
    req.on('data', (c) => trozos.push(c));
    req.on('end', () => {
      recibido = {
        metodo: req.method ?? '',
        cabeceras: req.headers as Record<string, string>,
        cuerpo: Buffer.concat(trozos),
      };
      res.writeHead(responder);
      res.end();
    });
  });

  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => {
  servidor?.close();
});

async function mandar(texto: string, ruta = '/push/abc123') {
  recibido = null;
  return enviarADispositivo({
    endpoint: `${base}${ruta}`,
    p256dh: dispositivo.p256dhB64,
    auth: dispositivo.authB64,
    claves: vapid,
    contacto: 'mailto:hola@bocazo.co',
    cuerpo: texto,
  });
}

describe('la petición que sale por el cable', () => {
  it('el "dispositivo" puede leer lo que le mandamos', async () => {
    // LA PRUEBA QUE IMPORTA: el mensaje llega entero al otro lado.
    responder = 201;
    const mensaje = JSON.stringify({ titulo: 'Bocazo', cuerpo: 'Tu pedido va en camino' });
    const r = await mandar(mensaje);

    expect(r.entrega).toBe('entregado');
    expect(recibido).not.toBeNull();

    const leido = await descifrarPayload(
      new Uint8Array(recibido!.cuerpo),
      dispositivo.privada,
      dispositivo.publica,
      dispositivo.auth
    );
    expect(leido).toBe(mensaje);
  });

  it('va por POST', async () => {
    responder = 201;
    await mandar('hola');
    expect(recibido!.metodo).toBe('POST');
  });

  it('lleva la firma VAPID y la clave pública juntas', async () => {
    responder = 201;
    await mandar('hola');

    const auth = recibido!.cabeceras['authorization'];
    expect(auth).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    // La clave de la cabecera tiene que ser la nuestra, o el servicio de push
    // no puede comprobar la firma.
    expect(auth).toContain(`k=${vapid.publica}`);
  });

  it('declara el cifrado que de verdad usa', async () => {
    responder = 201;
    await mandar('hola');
    // Con 'aesgcm' —el estándar anterior— el navegador no sabría descifrarlo,
    // y mezclarlos es la causa habitual de "llega pero no se abre".
    expect(recibido!.cabeceras['content-encoding']).toBe('aes128gcm');
    expect(recibido!.cabeceras['content-type']).toBe('application/octet-stream');
  });

  it('pide que se guarde doce horas y no más', async () => {
    responder = 201;
    await mandar('hola');
    // Un aviso de ayer ya no interesa: guardarlo más solo consigue que la
    // persona reciba algo desfasado al encender el móvil.
    expect(recibido!.cabeceras['ttl']).toBe('43200');
  });

  it('la audiencia del JWT es el origen del endpoint', async () => {
    responder = 201;
    await mandar('hola', '/wpush/v2/token-largo');

    const jwt = recibido!.cabeceras['authorization'].match(/t=([^,]+)/)![1];
    const cuerpo = JSON.parse(new TextDecoder().decode(deBase64Url(jwt.split('.')[1])));
    expect(cuerpo.aud).toBe(base);
    expect(cuerpo.aud).not.toContain('wpush');
  });

  it('cada envío usa una clave efímera distinta', async () => {
    responder = 201;
    await mandar('hola');
    const primera = Buffer.from(recibido!.cuerpo.subarray(21, 86)).toString('hex');
    await mandar('hola');
    const segunda = Buffer.from(recibido!.cuerpo.subarray(21, 86)).toString('hex');
    expect(primera).not.toBe(segunda);
  });
});

describe('cómo se interpreta la respuesta', () => {
  it('201 es entregado', async () => {
    responder = 201;
    expect((await mandar('x')).entrega).toBe('entregado');
  });

  it('200 también', async () => {
    // No todos los servicios responden 201.
    responder = 200;
    expect((await mandar('x')).entrega).toBe('entregado');
  });

  it('410 da la suscripción por muerta', async () => {
    // Revocó el permiso o desinstaló la web.
    responder = 410;
    expect((await mandar('x')).entrega).toBe('caducada');
  });

  it('404 también', async () => {
    responder = 404;
    expect((await mandar('x')).entrega).toBe('caducada');
  });

  it('500 NO la da por muerta', async () => {
    /*
      La distinción que evita el desastre.

      Un 500 es un problema del servicio de push, no de la suscripción. Tratarlo
      como baja borraría a media base de suscriptores durante una caída ajena, y
      no hay forma de recuperarlos: el canal para pedirles que vuelvan a
      suscribirse es justo el que se acaba de perder.
    */
    responder = 500;
    expect((await mandar('x')).entrega).toBe('fallo');
  });

  it('429 tampoco: es "vas muy rápido", no "no existe"', async () => {
    responder = 429;
    expect((await mandar('x')).entrega).toBe('fallo');
  });

  it('un endpoint inalcanzable es fallo, no baja', async () => {
    // Sin red no se sabe nada de la suscripción. Darla de baja por no poder
    // preguntar es perder suscriptores por un problema nuestro.
    const r = await enviarADispositivo({
      endpoint: 'https://127.0.0.1:1/push',
      p256dh: dispositivo.p256dhB64,
      auth: dispositivo.authB64,
      claves: vapid,
      contacto: 'mailto:hola@bocazo.co',
      cuerpo: 'x',
    });
    expect(r.entrega).toBe('fallo');
    expect(r.error).toBeTruthy();
  });

  it('unas claves de dispositivo corruptas no tumban el envío', async () => {
    // Nunca lanza: el cron recorre muchos comensales y uno roto no puede
    // detener la campaña entera.
    const r = await enviarADispositivo({
      endpoint: `${base}/push`,
      p256dh: 'esto-no-es-una-clave',
      auth: dispositivo.authB64,
      claves: vapid,
      contacto: 'mailto:hola@bocazo.co',
      cuerpo: 'x',
    });
    expect(r.entrega).toBe('fallo');
  });
});
