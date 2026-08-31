import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

/**
 * Login del staff. Server Action, sin JavaScript de cliente: la contraseña
 * viaja en el POST del formulario y nunca pasa por estado del navegador.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; activada?: string }>;
}) {
  const params = await searchParams;
  const sesion = await auth();
  if (sesion?.user) redirect(params.redirect || '/');

  async function iniciarSesion(formData: FormData) {
    'use server';
    const destino = (formData.get('redirect') as string) || '/';
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: destino,
      });
    } catch (error) {
      // signIn lanza NEXT_REDIRECT en el camino feliz: hay que dejarlo pasar.
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;
      if (typeof error === 'object' && error !== null && 'digest' in error) throw error;
      redirect(`/login?error=1${destino ? `&redirect=${encodeURIComponent(destino)}` : ''}`);
    }
  }

  return (
    <main style={{ maxWidth: '24rem', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        SIGH_FOOD CRM
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Acceso restringido al equipo.
      </p>

      {params.activada && (
        <p role="status" style={{ background: '#efe', border: '1px solid #bfb', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Cuenta activada. Ya puedes entrar con tu contraseña.
        </p>
      )}
      {params.error && (
        <p role="alert" style={{ background: '#fee', border: '1px solid #fbb', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Credenciales incorrectas.
        </p>
      )}

      <form action={iniciarSesion} style={{ display: 'grid', gap: '1rem' }}>
        <input type="hidden" name="redirect" value={params.redirect || '/'} />
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={{ padding: '0.6rem', border: '1px solid #ccc', borderRadius: '0.375rem' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ padding: '0.6rem', border: '1px solid #ccc', borderRadius: '0.375rem' }}
          />
        </label>
        <button
          type="submit"
          style={{ padding: '0.65rem', background: '#d97325', color: '#fff', border: 0, borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
