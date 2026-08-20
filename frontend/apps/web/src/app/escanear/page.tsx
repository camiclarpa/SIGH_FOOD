import { FormularioEscaneo } from './FormularioEscaneo';
import { LINEAS_PRODUCTO } from '@/lib/fidelizacion';

export const metadata = {
  title: 'SIGH_FOOD · Registra tu momento',
  description: 'Escanea, cuenta qué probaste y gana puntos.',
};

export const dynamic = 'force-dynamic';

/**
 * Captura en mesa.
 *
 * Es la única pantalla del sistema que ve un comensal, y la ve de pie, con el
 * móvil en una mano y comiendo con la otra. De ahí las decisiones:
 *
 *   · Un solo paso. Cada pantalla intermedia pierde gente.
 *   · Solo se piden WhatsApp y qué probó. El nombre es opcional; el email no se
 *     pide siquiera. Un formulario largo en una mesa no se rellena.
 *   · El consentimiento es una casilla explícita, sin marcar. Marcarla por
 *     defecto invalidaría el consentimiento que se está pidiendo.
 */
export default async function PaginaEscanear({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const token = p.qr ?? '';

  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">SIGH_FOOD</h1>
        <p className="texto-suave mt-3 text-sm">
          Escanea el código QR de tu mesa para registrar tu momento.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <header className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">SIGH_FOOD</p>
        <h1 className="mt-2 text-2xl font-semibold">¿Qué estás probando?</h1>
        {p.bar && (
          <p className="texto-suave mt-1 text-sm">
            {p.bar}
            {p.mesa ? ` · ${p.mesa}` : ''}
          </p>
        )}
      </header>

      <FormularioEscaneo token={token} lineas={[...LINEAS_PRODUCTO]} />

      <p className="texto-suave mt-6 text-center text-xs">
        Ganas 10 puntos por cada momento que registres. Los puntos se canjean por
        productos y experiencias.
      </p>
    </main>
  );
}
