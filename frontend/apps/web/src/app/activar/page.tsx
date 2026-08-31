import { redirect } from 'next/navigation';
import { activarInvitacion } from '@/lib/acciones/comensales';

/**
 * Activar una invitación: quien llega aquí todavía no tiene sesión —es
 * justo lo que está a punto de arreglar—, así que esta página vive fuera
 * de (crm) y no exige auth().
 */
export default async function ActivarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? '';

  async function activar(formData: FormData) {
    'use server';
    const t = formData.get('token') as string;
    const password = formData.get('password') as string;
    const confirmar = formData.get('confirmar') as string;

    if (password !== confirmar) {
      redirect(`/activar?token=${encodeURIComponent(t)}&error=nomatch`);
    }

    const r = await activarInvitacion({ token: t, password });
    if (!r.ok) {
      redirect(`/activar?token=${encodeURIComponent(t)}&error=1`);
    }
    redirect('/login?activada=1');
  }

  if (!token) {
    return (
      <main style={{ maxWidth: '24rem', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Enlace incompleto</h1>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Falta el token de invitación en el enlace. Pide que te lo vuelvan a compartir.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '24rem', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Activa tu cuenta
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Elige la contraseña con la que vas a entrar al CRM. Nadie más la va a ver.
      </p>

      {params.error === 'nomatch' && (
        <p role="alert" style={{ background: '#fee', border: '1px solid #fbb', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Las dos contraseñas no coinciden.
        </p>
      )}
      {params.error === '1' && (
        <p role="alert" style={{ background: '#fee', border: '1px solid #fbb', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Este enlace no es válido o ya caducó. Pide que te inviten de nuevo.
        </p>
      )}

      <form action={activar} style={{ display: 'grid', gap: '1rem' }}>
        <input type="hidden" name="token" value={token} />
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Nueva contraseña</span>
          <input
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            style={{ padding: '0.6rem', border: '1px solid #ccc', borderRadius: '0.375rem' }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Confírmala</span>
          <input
            name="confirmar"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            style={{ padding: '0.6rem', border: '1px solid #ccc', borderRadius: '0.375rem' }}
          />
        </label>
        <p style={{ color: '#666', fontSize: '0.8rem', marginTop: '-0.5rem' }}>Mínimo 12 caracteres.</p>
        <button
          type="submit"
          style={{ padding: '0.65rem', background: '#d97325', color: '#fff', border: 0, borderRadius: '0.375rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Activar cuenta
        </button>
      </form>
    </main>
  );
}
