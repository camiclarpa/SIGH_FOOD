import { defineConfig } from 'drizzle-kit';

// Este archivo llevaba la cadena de conexión de Neon —con usuario y contraseña—
// escrita en claro como valor por defecto. El archivo no está bajo control de
// versiones, así que la credencial no llegó a publicarse, pero un fallback así
// se acaba filtrando en cuanto alguien versiona el paquete o lo comparte.
// Ahora la URL solo se lee del entorno y, si falta, se falla de inmediato en
// lugar de conectar en silencio a una base que quizá no sea la esperada.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL no está definida. Expórtala antes de ejecutar drizzle-kit, ' +
    'por ejemplo: DATABASE_URL="postgresql://…" npx drizzle-kit push'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});