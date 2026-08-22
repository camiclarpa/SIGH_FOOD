import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Entrar from '@/componentes/Entrar';
import { COOKIE_SESION, identidadDe } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Entrar · Bocazo',
  robots: { index: false, follow: false },
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  // Quien ya tiene sesión no debería ver la pantalla de entrar: es un callejón
  // sin salida que además invita a pedir un código que no hace falta.
  const yo = await identidadDe((await cookies()).get(COOKIE_SESION)?.value);
  if (yo) redirect(p.volver ?? '/cuenta');

  return <Entrar volverA={p.volver ?? '/cuenta'} />;
}
