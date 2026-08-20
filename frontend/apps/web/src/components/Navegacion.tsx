'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ENLACES = [
  { href: '/panel', texto: 'Panel', icono: '◱' },
  { href: '/clientes', texto: 'Clientes', icono: '☰' },
  { href: '/pipeline', texto: 'Pipeline', icono: '⇉' },
  { href: '/consignacion', texto: 'Consignación', icono: '⇄' },
  { href: '/qr', texto: 'Códigos QR', icono: '⊞' },
  { href: '/agente', texto: 'Agente IA', icono: '◈' },
];

export function Navegacion({
  usuario,
  rol,
  cerrarSesion,
}: {
  usuario: string;
  rol: string;
  /** Server Action: un POST suelto a /api/auth/signout lo rechaza Auth.js por CSRF. */
  cerrarSesion: () => Promise<void>;
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  /**
   * Una ruta está activa si es la actual o si la actual cuelga de ella, para
   * que /clientes siga marcado dentro de /clientes/<id>. Comparar por igualdad
   * exacta apagaba el menú entero en las fichas de detalle.
   */
  const activo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  const enlaces = (
    <>
      {ENLACES.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          onClick={() => setAbierto(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            activo(e.href)
              ? 'bg-orange-500 font-medium text-white'
              : 'hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <span aria-hidden className="w-4 text-center">{e.icono}</span>
          {e.texto}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Barra superior: solo en móvil */}
      <header className="superficie sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <span className="font-semibold">SIGH_FOOD</span>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="rounded-lg border borde-tema px-3 py-1.5 text-sm"
          aria-expanded={abierto}
          aria-label="Menú"
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </header>

      {abierto && (
        <nav className="superficie border-b p-3 lg:hidden">
          <div className="flex flex-col gap-1">{enlaces}</div>
        </nav>
      )}

      {/* Lateral: solo en escritorio */}
      <aside className="superficie hidden w-60 shrink-0 border-r p-4 lg:flex lg:flex-col">
        <Link href="/panel" className="mb-6 block">
          <span className="text-lg font-semibold tracking-tight">SIGH_FOOD</span>
          <span className="texto-suave block text-xs">CRM</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">{enlaces}</nav>

        <div className="mt-4 border-t borde-tema pt-4">
          <p className="truncate text-sm font-medium" title={usuario}>{usuario}</p>
          <p className="texto-suave text-xs capitalize">{rol}</p>
          <form action={cerrarSesion} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-lg border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
