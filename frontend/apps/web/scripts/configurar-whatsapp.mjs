#!/usr/bin/env node
// =============================================================================
// Configurador de WhatsApp Business
// =============================================================================
//
// Pide las cinco variables, las escribe donde toca y comprueba contra Meta que
// de verdad funcionan.
//
// Existe por un motivo concreto: las credenciales las teclea su dueño y no pasan
// por ningún sitio intermedio. Los tres secretos se piden con la entrada oculta,
// no se imprimen nunca y no quedan en el historial del terminal — que es donde
// acaban cuando se pegan dentro de un comando.
//
// Uso:
//   node apps/web/scripts/configurar-whatsapp.mjs          → solo local (.env.local)
//   node apps/web/scripts/configurar-whatsapp.mjs --produccion  → además sube los
//                                                              secretos al Worker
//
// Se puede volver a ejecutar cuantas veces haga falta: sustituye los valores
// anteriores en lugar de duplicar líneas. Al rotar un token, esta es la vía.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_APP = path.resolve(AQUI, '..');
/**
 * `.env.development.local` y NO `.env.local`.
 *
 * Next lee `.env.local` TAMBIEN al compilar para produccion, y
 * opennextjs-cloudflare serializa todo process.env dentro del bundle del
 * Worker. Cualquier credencial en `.env.local` acaba en texto plano en el
 * paquete desplegado — paso en este proyecto con la contrasena de Neon, el
 * AUTH_SECRET y el token de Meta.
 *
 * `.env.development.local` solo se lee con NODE_ENV=development, asi que sirve
 * para el servidor de desarrollo y no contamina la compilacion.
 */
const ENV_DEV = path.join(RAIZ_APP, '.env.development.local');
const PRODUCCION = process.argv.includes('--produccion');

// -----------------------------------------------------------------------------
// Las variables
// -----------------------------------------------------------------------------
//
// `secreto` decide dos cosas: si la entrada se oculta al teclear y si se sube al
// Worker con `wrangler secret put`. Los dos identificadores no lo son —Meta los
// enseña en cada ejemplo de su documentación y no autentican nada por sí solos—,
// así que pueden ir como variables normales.

const VARIABLES = [
  {
    clave: 'WHATSAPP_VERIFY_TOKEN',
    secreto: true,
    ayuda: 'La cadena que tú eliges y luego pegas en Meta al dar de alta el webhook.',
  },
  {
    clave: 'WHATSAPP_APP_SECRET',
    secreto: true,
    ayuda: 'Meta → tu app → Configuración → Básica → App Secret. Firma los eventos entrantes.',
  },
  {
    clave: 'WHATSAPP_ACCESS_TOKEN',
    secreto: true,
    ayuda: 'Token PERMANENTE de un usuario del sistema. El de prueba caduca en 24 h (error 190).',
  },
  {
    clave: 'WHATSAPP_PHONE_NUMBER_ID',
    secreto: false,
    ayuda: 'Meta → WhatsApp → Configuración de la API, junto al número.',
  },
  {
    clave: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
    secreto: false,
    ayuda: 'Meta → WhatsApp → Configuración de la API (WABA ID).',
  },
];

// -----------------------------------------------------------------------------
// Entrada por teclado
// -----------------------------------------------------------------------------

/**
 * Una sola interfaz para toda la sesión.
 *
 * Crear una por pregunta parece más limpio pero no funciona: cada interfaz nueva
 * se traga lo que quedara en el búfer de entrada, así que a partir de la segunda
 * pregunta las respuestas se pierden o se descuadran.
 *
 * La salida va por un flujo propio que se puede silenciar. Es lo que permite
 * ocultar los secretos al teclearlos: sin esto, el token queda escrito en el
 * scrollback del terminal, que es justo donde no debe quedar.
 */
let silenciar = false;

const salida = new Writable({
  write(fragmento, _codificacion, siguiente) {
    if (!silenciar) process.stdout.write(fragmento);
    siguiente();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: salida,
  // Sin TTY —una tubería, como en las pruebas— readline no hace eco de nada, así
  // que no hay que ocultar nada y forzar el modo terminal solo estorba.
  terminal: process.stdin.isTTY === true,
});

/**
 * Las líneas se piden de una en una, no con `rl.question`.
 *
 * `rl.question` solo atrapa la línea que llegue DESPUÉS de llamarlo. Con la
 * entrada por tubería —como en las pruebas— readline emite todas las líneas de
 * golpe, así que a partir de la segunda pregunta ya no queda nada que atrapar:
 * el script se quedaba a medias y salía con código 0, sin error, que es la peor
 * forma de fallar. El iterador las va encolando y las entrega cuando se piden.
 */
const lineas = rl[Symbol.asyncIterator]();

async function preguntar(texto, oculto = false) {
  // El enunciado va directo a stdout: solo se oculta lo que se teclea.
  process.stdout.write(texto);
  if (oculto) silenciar = true;

  const { value, done } = await lineas.next();

  if (oculto) {
    silenciar = false;
    // El salto de línea del usuario tampoco se vio: se repone para que la
    // siguiente pregunta no salga pegada a la anterior.
    process.stdout.write('\n');
  }

  // Entrada agotada: se trata como "no cambiar", igual que un Enter en blanco.
  return done ? '' : String(value).trim();
}

// -----------------------------------------------------------------------------
// .env.local
// -----------------------------------------------------------------------------

/**
 * Sustituye la línea de una variable, o la añade si no estaba.
 *
 * Reescribe en lugar de anexar porque el archivo ya tiene estas cinco claves de
 * pruebas anteriores: anexar dejaría duplicados, y con dotenv gana la última —
 * un comportamiento que solo se descubre cuando algo falla sin motivo aparente.
 */
function fijarEnEnv(contenido, clave, valor) {
  const linea = `${clave}=${valor}`;
  const patron = new RegExp(`^${clave}=.*$`, 'm');
  return patron.test(contenido)
    ? contenido.replace(patron, linea)
    : `${contenido.replace(/\n*$/, '')}\n${linea}\n`;
}

// -----------------------------------------------------------------------------
// Comprobación contra Meta
// -----------------------------------------------------------------------------

/**
 * Pregunta a la Graph API por el número.
 *
 * Comprobar que las variables "están" no sirve de nada: un token caducado pasa
 * esa comprobación y falla en el primer envío. Esto llama de verdad.
 */
async function comprobar(valores) {
  const version = process.env.META_API_VERSION || 'v19.0';
  const url = `https://graph.facebook.com/${version}/${valores.WHATSAPP_PHONE_NUMBER_ID}` +
    '?fields=display_phone_number,verified_name,quality_rating';

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${valores.WHATSAPP_ACCESS_TOKEN}` },
  });
  const cuerpo = await r.json();

  if (!r.ok || cuerpo.error) {
    const e = cuerpo.error ?? {};
    const pistas = {
      190: 'El token caducó o fue revocado. Genera uno permanente de usuario del sistema.',
      100: 'El PHONE_NUMBER_ID no parece correcto, o el token no tiene permiso sobre ese número.',
      4: 'Meta está limitando las peticiones. Espera un momento y repite.',
    };
    return { ok: false, motivo: `${e.code ?? r.status}: ${e.message ?? 'error desconocido'}`, pista: pistas[e.code] };
  }

  return {
    ok: true,
    numero: cuerpo.display_phone_number,
    nombre: cuerpo.verified_name,
    calidad: cuerpo.quality_rating,
  };
}

// -----------------------------------------------------------------------------

async function principal() {
  console.log('\n  Configuración de WhatsApp Business');
  console.log('  ' + '-'.repeat(60));
  console.log('  Los tres secretos no se muestran al teclearlos ni se imprimen después.');
  console.log('  Deja una respuesta en blanco para conservar el valor que ya hubiera.\n');

  if (!fs.existsSync(ENV_DEV)) {
    console.error(`  No existe ${ENV_DEV}. Créalo antes (necesita al menos DATABASE_URL).\n`);
    process.exit(1);
  }

  let contenido = fs.readFileSync(ENV_DEV, 'utf8');
  const valores = {};
  const cambiadas = [];

  for (const v of VARIABLES) {
    console.log(`  ${v.clave}`);
    console.log(`    ${v.ayuda}`);

    const previo = (contenido.match(new RegExp(`^${v.clave}=(.*)$`, 'm')) ?? [])[1]?.trim() ?? '';
    const etiqueta = previo ? '    valor (Enter = conservar el actual): ' : '    valor: ';
    const dado = await preguntar(etiqueta, v.secreto);

    const valor = dado || previo;
    if (!valor) {
      console.error(`\n  Falta ${v.clave}. Sin ella la pasarela no queda operativa.\n`);
      process.exit(1);
    }

    valores[v.clave] = valor;
    if (dado) cambiadas.push(v);
    contenido = fijarEnEnv(contenido, v.clave, valor);
    console.log('');
  }

  rl.close();

  fs.writeFileSync(ENV_DEV, contenido, 'utf8');
  console.log(`  Guardado en ${path.relative(process.cwd(), ENV_DEV)} (ignorado por git).\n`);

  // --- Comprobación real ---
  console.log('  Comprobando contra la Graph API de Meta…');
  const r = await comprobar(valores);

  if (r.ok) {
    console.log(`  Conectado: ${r.numero} · ${r.nombre}${r.calidad ? ` · calidad ${r.calidad}` : ''}\n`);
  } else {
    console.log(`  NO conecta — ${r.motivo}`);
    if (r.pista) console.log(`  ${r.pista}`);
    console.log('  Los valores quedan guardados igualmente: corrige y vuelve a ejecutar.\n');
  }

  // --- Producción ---
  if (!PRODUCCION) {
    console.log('  Solo se ha configurado el entorno local.');
    console.log('  Para subirlo al Worker, repite con --produccion.\n');
    return;
  }

  console.log('  Subiendo al Worker de Cloudflare…');
  console.log('  (los dos identificadores no son secretos: van en wrangler.jsonc como vars)\n');

  for (const v of VARIABLES.filter((x) => x.secreto)) {
    // El valor se pasa por stdin, no como argumento: un argumento queda en la
    // lista de procesos del sistema y a la vista de cualquiera que haga `ps`.
    const p = spawnSync('npx', ['wrangler', 'secret', 'put', v.clave], {
      cwd: RAIZ_APP,
      input: valores[v.clave],
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: process.platform === 'win32',
    });
    console.log(p.status === 0 ? `  ${v.clave} subido` : `  ${v.clave} FALLÓ (código ${p.status})`);
  }

  console.log('\n  Si wrangler pide autenticación, ejecuta antes `npx wrangler login`.');
  console.log('  Y añade a wrangler.jsonc, dentro de "vars":');
  console.log(`    "WHATSAPP_PHONE_NUMBER_ID": "${valores.WHATSAPP_PHONE_NUMBER_ID}",`);
  console.log(`    "WHATSAPP_BUSINESS_ACCOUNT_ID": "${valores.WHATSAPP_BUSINESS_ACCOUNT_ID}"\n`);
}

principal().catch((e) => {
  console.error('\n  Error:', e.message, '\n');
  process.exit(1);
});
