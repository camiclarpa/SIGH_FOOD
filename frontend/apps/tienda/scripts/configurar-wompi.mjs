#!/usr/bin/env node
// =============================================================================
// Configurar la pasarela de pagos (Wompi)
// =============================================================================
//
// Pide las credenciales, las escribe donde toca y COMPRUEBA contra la API de
// Wompi que la llave funciona de verdad — no que exista, que funciona. Una
// llave revocada pasa cualquier comprobación de "¿está definida la variable?" y
// falla en el primer cobro, con un cliente delante.
//
// Uso:
//   node scripts/configurar-wompi.mjs                 solo local (.env.local)
//   node scripts/configurar-wompi.mjs --produccion    y además sube al Worker
//
// Los secretos se teclean con la entrada OCULTA y no quedan en el historial del
// terminal, que es lo que pasa al pegarlos dentro de un comando. Un Enter en
// blanco conserva el valor que ya hubiera, así que se puede ejecutar para
// cambiar una sola cosa.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_APP = path.resolve(AQUI, '..');
const ENV_LOCAL = path.join(RAIZ_APP, '.env.local');
const PRODUCCION = process.argv.includes('--produccion');

/**
 * Qué se pide.
 *
 * La llave PÚBLICA no es un secreto: está pensada para viajar en el navegador,
 * es la que identifica al comercio en el checkout. Aun así va por el mismo
 * camino que las demás para no tener dos mecanismos.
 *
 * La llave PRIVADA no la usa esta tienda: el checkout alojado no la necesita, y
 * no pedirla es una decisión — lo que no se guarda no se puede filtrar. Se
 * incluye comentada abajo por si algún día hace falta consultar transacciones
 * desde el servidor.
 */
const VARIABLES = [
  {
    clave: 'WOMPI_PUBLIC_KEY',
    etiqueta: 'Llave pública',
    ayuda: 'Wompi → Desarrollo → Programadores → Llaves del API (pub_prod_… o pub_test_…)',
    secreto: false,
    valida: (v) => /^pub_(prod|test)_[A-Za-z0-9]+$/.test(v) || 'Debe empezar por pub_prod_ o pub_test_',
  },
  {
    clave: 'WOMPI_INTEGRITY_SECRET',
    etiqueta: 'Secreto de integridad',
    ayuda: 'Wompi → Desarrollo → Programadores → Secretos → Integridad',
    secreto: true,
    valida: (v) => /^(prod|test)_integrity_/.test(v) || 'Debe empezar por prod_integrity_ o test_integrity_',
  },
  {
    clave: 'WOMPI_EVENTS_SECRET',
    etiqueta: 'Secreto de eventos',
    ayuda: 'Wompi → Desarrollo → Programadores → Secretos → Eventos',
    secreto: true,
    valida: (v) => /^(prod|test)_events_/.test(v) || 'Debe empezar por prod_events_ o test_events_',
  },
];

// ---------------------------------------------------------------------------
// Entrada oculta
// ---------------------------------------------------------------------------

let silenciar = false;

const salida = new Writable({
  write(fragmento, _cod, hecho) {
    if (!silenciar) process.stdout.write(fragmento);
    hecho();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: salida,
  terminal: process.stdin.isTTY === true,
});

const lineas = rl[Symbol.asyncIterator]();

async function preguntar(texto, oculto = false) {
  process.stdout.write(texto);
  silenciar = oculto;
  const { value } = await lineas.next();
  silenciar = false;
  if (oculto) process.stdout.write('\n');
  return (value ?? '').trim();
}

// ---------------------------------------------------------------------------
// .env.local
// ---------------------------------------------------------------------------

function leerEnv() {
  if (!fs.existsSync(ENV_LOCAL)) return '';
  return fs.readFileSync(ENV_LOCAL, 'utf8');
}

function valorDe(contenido, clave) {
  const m = contenido.match(new RegExp(`^${clave}=(.*)$`, 'm'));
  return m ? m[1].trim() : '';
}

/** Sustituye la línea si existe; si no, la añade. Nunca duplica. */
function fijarEnEnv(contenido, clave, valor) {
  const linea = `${clave}=${valor}`;
  const re = new RegExp(`^${clave}=.*$`, 'm');
  if (re.test(contenido)) return contenido.replace(re, linea);
  return contenido.replace(/\n*$/, '\n') + linea + '\n';
}

// ---------------------------------------------------------------------------
// Comprobación real contra Wompi
// ---------------------------------------------------------------------------

/**
 * Pregunta a Wompi si la llave sirve.
 *
 * /merchants/{llave_publica} es público y devuelve los datos del comercio. Si
 * responde, la llave existe y está activa. Es la diferencia entre "la variable
 * está puesta" y "los cobros van a funcionar".
 */
async function comprobar(llavePublica) {
  const url = `https://production.wompi.co/v1/merchants/${encodeURIComponent(llavePublica)}`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const d = await r.json().catch(() => null);

    if (!r.ok || !d?.data) {
      return { ok: false, motivo: d?.error?.reason ?? `Wompi respondió ${r.status}` };
    }

    const m = d.data;
    return {
      ok: true,
      comercio: m.name,
      // Qué medios de pago tiene habilitados de verdad. Si el comercio no tiene
      // PSE activo, ofrecerlo en el checkout produce un error al final del
      // proceso — cuando ya decidió comprar.
      metodos: (m.accepted_payment_methods ?? []).join(', ') || 'sin datos',
    };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'No se pudo contactar con Wompi' };
  }
}

// ---------------------------------------------------------------------------

async function principal() {
  console.log('\n  Configurar la pasarela de pagos (Wompi)');
  console.log('  ' + '='.repeat(44) + '\n');
  console.log('  Los secretos no se ven al escribirlos.');
  console.log('  Enter en blanco conserva el valor que ya haya.\n');

  let contenido = leerEnv();
  const valores = {};

  for (const v of VARIABLES) {
    const actual = valorDe(contenido, v.clave);
    const pista = actual
      ? ` [actual: ${v.secreto ? '•'.repeat(8) : actual.slice(0, 14) + '…'}]`
      : '';

    console.log(`  ${v.etiqueta}`);
    console.log(`    ${v.ayuda}`);

    for (;;) {
      const entrada = await preguntar(`    ${v.clave}${pista}: `, v.secreto);

      if (!entrada) {
        if (actual) {
          valores[v.clave] = actual;
          break;
        }
        console.log('    Hace falta un valor.\n');
        continue;
      }

      const bien = v.valida ? v.valida(entrada) : true;
      if (bien !== true) {
        console.log(`    ${bien}\n`);
        continue;
      }

      valores[v.clave] = entrada;
      break;
    }
    console.log('');
  }

  // --- Escribir en .env.local ---
  for (const [clave, valor] of Object.entries(valores)) {
    contenido = fijarEnEnv(contenido, clave, valor);
  }
  fs.writeFileSync(ENV_LOCAL, contenido, 'utf8');
  console.log(`  Guardado en ${path.relative(process.cwd(), ENV_LOCAL)}\n`);

  // --- Aviso de entorno ---
  const esPruebas = valores.WOMPI_PUBLIC_KEY.includes('_test_');
  const integridadPruebas = valores.WOMPI_INTEGRITY_SECRET.startsWith('test_');
  const eventosPruebas = valores.WOMPI_EVENTS_SECRET.startsWith('test_');

  if (esPruebas !== integridadPruebas || esPruebas !== eventosPruebas) {
    // Mezclar entornos es el fallo más difícil de diagnosticar de esta
    // integración: las firmas nunca cuadran y el mensaje de Wompi no dice por
    // qué.
    console.log('  AVISO: estás mezclando llaves de producción con secretos de pruebas.');
    console.log('  Las firmas no van a cuadrar. Revisa que las tres sean del mismo entorno.\n');
  } else if (esPruebas) {
    console.log('  Entorno de PRUEBAS (sandbox). Los cobros no mueven dinero real.\n');
  } else {
    console.log('  Entorno de PRODUCCIÓN. Los cobros son reales.\n');
  }

  // --- Comprobar contra Wompi ---
  console.log('  Comprobando la llave contra Wompi...');
  const r = await comprobar(valores.WOMPI_PUBLIC_KEY);

  if (r.ok) {
    console.log(`  OK  comercio: ${r.comercio}`);
    console.log(`      medios de pago activos: ${r.metodos}\n`);
  } else {
    console.log(`  FALLO  ${r.motivo}`);
    console.log('  La llave se guardó igualmente, pero los cobros no van a funcionar.\n');
  }

  // --- Subir al Worker ---
  if (PRODUCCION) {
    console.log('  Subiendo los secretos al Worker...\n');

    for (const v of VARIABLES) {
      // El valor va por stdin, nunca como argumento: un argumento queda visible
      // en la lista de procesos del sistema.
      const p = spawnSync('npx', ['wrangler', 'secret', 'put', v.clave], {
        cwd: RAIZ_APP,
        input: valores[v.clave],
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        encoding: 'utf8',
      });

      console.log(
        p.status === 0
          ? `    ${v.clave}: subido`
          : `    ${v.clave}: FALLO — ${`${p.stdout ?? ''}${p.stderr ?? ''}`
              .split('\n')
              .filter(Boolean)
              .slice(-2)
              .join(' | ')}`
      );
    }

    console.log('\n  Si wrangler pide autenticación, ejecuta antes `npx wrangler login`.');
  } else {
    console.log('  Para subirlos también al Worker de producción:');
    console.log('    node scripts/configurar-wompi.mjs --produccion');
  }

  // --- Qué falta por hacer en el panel de Wompi ---
  console.log('\n  Falta un paso que solo se puede hacer en el panel de Wompi:');
  console.log('  Desarrollo → Programadores → URL de Eventos, y pega:');
  console.log('\n    https://bocazo-tienda.camiloriverac0.workers.dev/api/webhooks/wompi\n');
  console.log('  Sin eso, Wompi cobra pero nadie se entera y el pedido se queda');
  console.log('  esperando para siempre.\n');

  rl.close();
}

principal().catch((e) => {
  console.error('\n  Error:', e instanceof Error ? e.message : e);
  rl.close();
  process.exit(1);
});
