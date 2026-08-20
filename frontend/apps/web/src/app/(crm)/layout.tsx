import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { Navegacion } from '@/components/Navegacion';

/**
 * Layout de las pantallas del CRM.
 *
 * El middleware ya bloquea el acceso sin sesión, pero aquí se vuelve a
 * comprobar: el middleware valida el JWT y este layout necesita además leer el
 * usuario para pintarlo. Si alguien cambia el matcher del middleware, esta
 * comprobación sigue siendo la que impide servir la página.
 *
 * `(crm)` es un grupo de rutas: agrupa las páginas bajo este layout sin añadir
 * ningún segmento a la URL.
 */
export default async function LayoutCrm({ children }: { children: ReactNode }) {
  const sesion = await auth();

  if (!sesion?.user) {
    redirect('/login');
  }

  async function cerrarSesion() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  const usuario = sesion.user.email ?? 'Sin identificar';
  const rol = (sesion.user as { role?: string }).role ?? 'lectura';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Navegacion usuario={usuario} rol={rol} cerrarSesion={cerrarSesion} />
      <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
