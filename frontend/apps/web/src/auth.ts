// =============================================================================
// SIGH_FOOD - Configuración completa de Auth.js (NextAuth v5)
// =============================================================================
//
// El CRM lo usa solo el equipo interno, así que no hay registro público ni
// proveedores sociales: credenciales contra la tabla `staff_users`.
//
// Este módulo toca la base de datos, así que NO puede importarse desde el
// middleware, que corre en Edge Runtime. La parte que el middleware necesita
// —validar el JWT— vive en auth.config.ts.
//
// La sesión es JWT y no de base de datos a propósito: en Cloudflare Workers
// cada petición puede caer en un isolate distinto, y validar la sesión contra
// Postgres en cada llamada añadiría un viaje a la BD a todo el CRM.

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { eq } from 'drizzle-orm';
import { getDb, type CloudflareEnv } from '@sighfood/domain/db';
import { staffUsers } from '@sighfood/domain/db/schema';
import { verificarPassword } from '@sighfood/domain/lib/password';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { authConfig, type RolStaff } from '@/auth.config';

export type { RolStaff };

/**
 * Igual que en las rutas de API: en Workers la conexión viene del binding
 * HYPERDRIVE, no de DATABASE_URL. Sin esto el login sería el único punto de la
 * aplicación que intenta conectarse por la vía local, y en producción fallaría.
 */
async function entornoCloudflare(): Promise<CloudflareEnv | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as CloudflareEnv;
  } catch {
    return undefined;
  }
}

// `providers` se desestructura fuera del spread: authConfig lo declara vacío
// (el middleware no autentica, solo valida el JWT) y aquí se sustituye por el
// proveedor real. Sin esto el bundle queda con la clave duplicada.
const { providers: _sinProveedores, ...configBase } = authConfig;

// NextAuth admite una función de configuración, que aquí es necesaria: el
// secreto hay que resolverlo por petición.
//
// En Cloudflare las variables no viven en process.env sino en el `env` del
// Worker, así que Auth.js no encontraba AUTH_SECRET y todo el flujo de login
// respondía 500 con "There was a problem with the server configuration",
// incluido /api/auth/csrf. En local sigue leyéndose de process.env.
export const { handlers, auth, signIn, signOut } = NextAuth(async () => ({
  ...configBase,
  secret: (await entornoCloudflare())?.AUTH_SECRET ?? process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!email || !password) return null;

        const db = getDb(await entornoCloudflare());
        const [usuario] = await db
          .select()
          .from(staffUsers)
          .where(eq(staffUsers.email, email))
          .limit(1);

        // Mismo tratamiento para "no existe" y "contraseña incorrecta": indicar
        // cuál de los dos falló permitiría enumerar qué correos tienen cuenta.
        if (!usuario || !usuario.isActive) return null;

        const valida = await verificarPassword(password, usuario.passwordHash);
        if (!valida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.fullName,
          role: usuario.role,
        };
      },
    }),
  ],
}));
