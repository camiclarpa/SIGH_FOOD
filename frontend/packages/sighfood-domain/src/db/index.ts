// =============================================================================
// SIGH_FOOD - Database Client (Hybrid: Local + Cloudflare Hyperdrive)
// =============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for Cloudflare Hyperdrive binding
interface Hyperdrive {
  connectionString: string;
}

// Type for Cloudflare environment
export interface CloudflareEnv {
  HYPERDRIVE: Hyperdrive;
  DATABASE_URL?: string;
}

// Database client type
export type Database = ReturnType<typeof drizzle>;

// Global database instance (singleton pattern)
let globalDb: Database | null = null;

/**
 * Get database connection
 * 
 * In local development: Uses process.env.DATABASE_URL (Neon PostgreSQL)
 * In Cloudflare Workers: Uses env.HYPERDRIVE (Cloudflare Hyperdrive)
 * 
 * @param cloudflareEnv - Optional Cloudflare environment (only needed in Workers)
 * @returns Database instance
 */
export function getDb(cloudflareEnv?: CloudflareEnv): Database {
  // If we already have a database instance, return it (singleton)
  if (globalDb) {
    return globalDb;
  }

  // Check if we're running in Cloudflare Workers environment
  if (cloudflareEnv?.HYPERDRIVE) {
    // Production: Use Cloudflare Hyperdrive
    console.log('🔌 Connecting to Cloudflare Hyperdrive...');
    
    const hyperdriveClient = postgres(cloudflareEnv.HYPERDRIVE.connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    globalDb = drizzle(hyperdriveClient, { schema });
    
    console.log('✅ Connected to Cloudflare Hyperdrive');
    return globalDb;
  }

  // Development: Use direct Neon PostgreSQL connection
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please set it in your .env file or environment variables.'
    );
  }

  // `postgres()` no abre la conexión aquí: es perezoso y solo conecta en la
  // primera consulta. Por eso no se anuncia "conectado" — antes se hacía, y el
  // log decía "✅ Connected" justo antes de que la primera query fallara con
  // ENOTFOUND, apuntando en la dirección equivocada al diagnosticar.
  console.log('🔌 Cliente de Neon PostgreSQL preparado (conexión perezosa)');

  const postgresClient = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  globalDb = drizzle(postgresClient, { schema });

  return globalDb;
}

/**
 * Close database connection
 * Call this when shutting down the application
 */
export async function closeDb(): Promise<void> {
  if (globalDb) {
    console.log('🔌 Closing database connection...');
    globalDb = null;
    console.log('✅ Database connection closed');
  }
}

// Export schema for convenience
export { schema };