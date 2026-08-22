/**
 * Mi cuenta.
 *
 * Lo que hace que alguien vuelva: su historial, sus favoritos y el club. Sin
 * sesión no hay nada que enseñar, así que redirige a entrar conservando el
 * destino.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE_SESION, identidadDe } from '@/lib/sesion';
import { estadoClub, favoritosDe, historial } from '@/lib/club';
import VistaCuenta from '@/componentes/VistaCuenta';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi cuenta · Bocazo',
  robots: { index: false, follow: false },
};

export default async function PaginaCuenta() {
  const yo = await identidadDe((await cookies()).get(COOKIE_SESION)?.value);
  if (!yo) redirect('/entrar?volver=/cuenta');

  const [club, pedidos, favoritos] = await Promise.all([
    estadoClub(yo.consumerId),
    historial(yo.consumerId),
    favoritosDe(yo.consumerId),
  ]);

  return <VistaCuenta identidad={yo} club={club} pedidos={pedidos} favoritos={favoritos} />;
}
