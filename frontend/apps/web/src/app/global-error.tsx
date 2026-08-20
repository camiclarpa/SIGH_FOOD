'use client';

// =============================================================================
// Último recurso: fallo en el layout raíz
// =============================================================================
//
// El error.tsx de (crm) cubre las pantallas, pero no puede cubrir un fallo del
// propio layout raíz, porque para entonces React ya no tiene dónde pintarlo.
// Este archivo sí: reemplaza el documento entero, y por eso incluye <html> y
// <body> propios.
//
// Es la diferencia entre una página que explica qué pasa y una pantalla en
// blanco. No usa las clases de Tailwind: si lo que falló fue la carga de los
// estilos, depender de ellos aquí dejaría el mensaje ilegible.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1120',
          color: '#e2e8f0',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>SIGH_FOOD CRM</h1>

          <p style={{ marginTop: '1rem', color: '#94a3b8', lineHeight: 1.6 }}>
            La aplicación no pudo arrancar. Suele ser un fallo temporal; si persiste,
            revisa el estado del sistema.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#ea580c',
                color: '#fff',
                border: 0,
                borderRadius: '0.375rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>

            <a
              href="/api/health"
              style={{
                border: '1px solid #334155',
                color: '#cbd5e1',
                borderRadius: '0.375rem',
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Estado del sistema
            </a>
          </div>

          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#475569' }}>
              Referencia para soporte: <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
