// =============================================================================
// SIGH_FOOD - Configuración de Auth.js compatible con Edge Runtime
// =============================================================================
//
// El middleware (proxy.ts) se ejecuta en Edge Runtime, donde no existen los
// módulos de Node. Si importa la configuración completa arrastra consigo
// postgres.js y @opennextjs/cloudflare, y Next falla al cargar el middleware
// con "TypeError: adapterFn is not a function" — un 500 en TODAS las rutas,
// no solo en las de base de datos.
//
// Por eso Auth.js v5 recomienda partir la configuración: aquí lo que puede
// correr en el edge (verificar el JWT), y en auth.ts lo que necesita la base
// de datos (validar credenciales contra staff_users).

import type { NextAuthConfig } from 'next-auth';

export type RolStaff = 'admin' | 'comercial' | 'lectura';

export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 horas: una jornada laboral
  },
  pages: {
    signIn: '/login',
  },
  // Los proveedores reales se añaden en auth.ts. El middleware solo necesita
  // leer y validar el token ya emitido, no volver a autenticar.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: RolStaff }).role ?? 'lectura';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: RolStaff }).role = (token.role as RolStaff) ?? 'lectura';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
