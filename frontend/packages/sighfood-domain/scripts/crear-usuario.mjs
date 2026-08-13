/**
 * Alta de un usuario del staff en el CRM.
 *
 *   DATABASE_URL="postgresql://..." node scripts/crear-usuario.mjs \
 *     --email ana@sighfood.co --nombre "Ana Gomez" --rol admin
 *
 * La contraseña se pide por stdin para que no quede en el historial del shell.
 * Si el correo ya existe, actualiza la contraseña y el rol.
 */
import postgres from 'postgres';
import readline from 'node:readline';

const ITERACIONES = 100_000; // techo de Cloudflare Workers

function arg(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const aHex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');

async function hashear(password) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' }, material, 256
  );
  return `${ITERACIONES}:${aHex(sal)}:${aHex(bits)}`;
}

function preguntarPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Contraseña para el usuario: ', (valor) => {
      rl.close();
      resolve(valor);
    });
  });
}

const email = (arg('email') || '').trim().toLowerCase();
const nombre = arg('nombre') || '';
const rol = arg('rol') || 'lectura';

if (!email || !nombre) {
  console.error('Faltan argumentos. Uso:\n  node scripts/crear-usuario.mjs --email x@y.co --nombre "Nombre" --rol admin');
  process.exit(1);
}
if (!['admin', 'comercial', 'lectura'].includes(rol)) {
  console.error(`Rol inválido: ${rol}. Debe ser admin, comercial o lectura.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el entorno.');
  process.exit(1);
}

const password = arg('password') || (await preguntarPassword());
if (!password || password.length < 12) {
  console.error('La contraseña debe tener al menos 12 caracteres.');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 20 });
try {
  const hash = await hashear(password);
  const [fila] = await sql`
    insert into staff_users (email, full_name, password_hash, role)
    values (${email}, ${nombre}, ${hash}, ${rol})
    on conflict (email) do update
      set password_hash = excluded.password_hash,
          role = excluded.role,
          full_name = excluded.full_name,
          is_active = true
    returning id, email, role`;
  console.log(`Usuario listo: ${fila.email}  (rol: ${fila.role}, id: ${fila.id})`);
} finally {
  await sql.end({ timeout: 5 });
}
