// =============================================================================
// Comprobar que las notificaciones pueden llegar a un navegador
// =============================================================================
//
// Existe por un fallo que estuvo desplegado y no daba ningún error.
//
// LA CLAVE PÚBLICA NO LLEGABA AL NAVEGADOR
// ----------------------------------------
// Se pasaba como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, y Next incrusta esas variables
// AL COMPILAR, leyendo .env.local o .env.production. Este proyecto guarda su
// configuración en .env.development.local —precisamente para que los secretos no
// acaben dentro del paquete— y Next NO lee ese archivo en una compilación de
// producción.
//
// El resultado: la clave quedaba como `undefined`. El componente de avisos hace
// `if (!claveVapid) return;`, así que salía sin pintar nada. Nadie veía nunca la
// tarjeta, nadie se suscribía, y en el CRM el botón de prueba decía —con razón—
// que ese comensal no tenía notificaciones activadas.
//
// No había ni un error en ningún registro. Por eso esta comprobación mira lo
// único que importa: que la clave viaje de verdad en el HTML que recibe el móvil.
//
// Ahora se lee en tiempo de ejecución desde el binding del Worker, así que el
// problema no puede repetirse por esa vía. Esta prueba lo vigila igualmente.

const TIENDA = process.env.URL_TIENDA ?? 'https://bocazo-tienda.camiloriverac0.workers.dev';

const res = [];
const ok = (n, c, d = '') => {
  res.push(c);
  console.log(`${c ? 'OK   ' : 'FALLO'} ${n}${d ? '  ' + d : ''}`);
};

console.log('===== 1) EL SERVICE WORKER SE SIRVE EN LA RAIZ =====');
const sw = await fetch(`${TIENDA}/sw.js`);
const fuente = await sw.text();
ok('/sw.js responde 200', sw.status === 200, String(sw.status));
// Servido desde /_next/static/ solo controlaria esa carpeta, y las
// notificaciones no llegarian nunca.
ok('se sirve desde la raiz', sw.url.endsWith('/sw.js'), sw.url);
ok('escucha el evento push', fuente.includes("addEventListener('push'"));
ok('reacciona al toque', fuente.includes("addEventListener('notificationclick'"));
ok('renueva la suscripcion si el navegador la rota', fuente.includes('pushsubscriptionchange'));
ok('NO cachea nada', !/caches\.open|cache\.addAll/.test(fuente));

console.log('\n===== 2) LA CLAVE PUBLICA LLEGA AL NAVEGADOR =====');
// La comprobacion que faltaba. Sin esto, todo lo demas puede estar bien y no
// aparecer jamas el aviso.
const r = await fetch(`${TIENDA}/api/push/clave`);
const d = await r.json().catch(() => null);
const clave = d?.clave ?? '';

ok('el endpoint de la clave responde', r.status === 200, `${r.status} ${d?.error ?? ''}`);

// Una clave VAPID sin comprimir son 87 caracteres en base64url y empieza por
// 'B' (el 0x04 que marca el punto sin comprimir). Se comprueba la FORMA, no un
// valor concreto, para que la prueba siga sirviendo si algun dia se regenera.
ok(
  'devuelve una clave con forma de VAPID',
  /^B[A-Za-z0-9_-]{86}$/.test(clave),
  clave ? `${clave.slice(0, 12)}… (${clave.length} caracteres)` : 'vacia'
);

// No cambia nunca —rotarla invalidaria todas las suscripciones existentes— asi
// que no tiene sentido volver a pedirla en cada visita.
ok('se puede cachear', (r.headers.get('cache-control') ?? '').includes('max-age'));

console.log('\n===== 3) SUSCRIBIRSE EXIGE SESION =====');

const cuerpoValido = JSON.stringify({
  suscripcion: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/prueba',
    keys: { p256dh: 'a'.repeat(30), auth: 'b'.repeat(20) },
  },
});

const sinSesion = await fetch(`${TIENDA}/api/push/suscribir`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: cuerpoValido,
});
ok('rechaza sin sesion', sinSesion.status === 401, String(sinSesion.status));

const baja = await fetch(`${TIENDA}/api/push/suscribir?endpoint=https://x`, { method: 'DELETE' });
ok('la baja tambien exige sesion', baja.status === 401, String(baja.status));

// El endpoint se usa como destino de un fetch DESDE EL SERVIDOR: aceptar
// cualquier cadena lo convertiria en una forma de hacer que nuestro servidor
// llame a donde le digan.
const httpPlano = await fetch(`${TIENDA}/api/push/suscribir`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    suscripcion: {
      endpoint: 'http://interno.local/x',
      keys: { p256dh: 'a'.repeat(30), auth: 'b'.repeat(20) },
    },
  }),
});
ok('no acepta http plano', [400, 401].includes(httpPlano.status), String(httpPlano.status));

console.log(`\n${res.filter(Boolean).length}/${res.length} comprobaciones correctas`);
console.log('\nLo que esto NO comprueba: que una notificacion llegue a un movil.');
console.log('Eso necesita un telefono de verdad: abrir la tienda, iniciar sesion,');
console.log('aceptar el aviso, y usar el boton de prueba en la ficha del comensal.');

if (res.some((x) => !x)) process.exitCode = 1;


