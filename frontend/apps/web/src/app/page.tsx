import Link from 'next/link';

/**
 * Raíz de @sighfood/web.
 *
 * Sin este archivo `/` devolvía 404: la app solo tenía /b2b y las rutas de API.
 */
export default function HomePage() {
  return (
    <main style={{ padding: '3rem 1.5rem', maxWidth: '48rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
        SIGH_FOOD
      </h1>
      <p style={{ marginBottom: '2rem', lineHeight: 1.6 }}>
        Portafolio de conos RTA para gastrobares.
      </p>
      <Link href="/b2b" style={{ textDecoration: 'underline' }}>
        Ir a la landing B2B
      </Link>
    </main>
  );
}
