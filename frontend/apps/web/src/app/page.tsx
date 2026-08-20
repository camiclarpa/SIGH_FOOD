import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Raíz de @sighfood/web.
 *
 * Sin este archivo `/` devolvía 404: la app solo tenía /b2b y las rutas de API.
 * Ahora que existe el CRM, la raíz solo decide a dónde va cada quien: al panel
 * si hay sesión, al login si no. Dejarla como página de bienvenida obligaba a
 * un clic extra en cada visita.
 */
export const dynamic = 'force-dynamic';

export default async function PaginaRaiz() {
  const sesion = await auth();
  redirect(sesion?.user ? '/panel' : '/login');
}
