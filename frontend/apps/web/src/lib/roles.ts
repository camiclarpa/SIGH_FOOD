// =============================================================================
// Roles y permisos: la parte que también vale en el navegador
// =============================================================================
//
// Vive separada de permisos.ts porque aquel importa `@/auth` para leer la
// sesión, y `@/auth` arrastra postgres.js. Un componente cliente que solo
// quisiera la etiqueta de un rol acababa metiendo el driver de Postgres entero
// en el bundle del navegador, y el build de Workers lo rechaza.
//
// Aquí no hay nada que toque la sesión ni la base: solo la tabla de qué puede
// hacer cada rol, que es información estática.

export type Rol = 'admin' | 'comercial' | 'lectura';

export type Permiso =
  // Fidelización
  | 'premios.gestionar'
  | 'canjes.emitir'
  | 'canjes.entregar'
  | 'canjes.anular'
  | 'puntos.ajustar'
  | 'desafios.gestionar'
  // Comensales
  | 'comensales.editar'
  | 'consentimientos.revocar'
  | 'resenas.moderar'
  // Mensajería
  | 'campanas.editar'
  | 'campanas.activar'
  | 'campanas.probar'
  // QR
  | 'qr.gestionar'
  | 'qr.redirigir'
  // Agente IA
  | 'agente.aprobar'
  | 'agente.calibrar'
  | 'agente.sandbox'
  // Sistema
  | 'datos.exportar'
  | 'usuarios.gestionar';

/**
 * Qué puede hacer cada rol.
 *
 * `comercial` opera el día a día pero no toca la configuración del agente ni
 * los usuarios: calibrar un umbral o activar una campaña cambia el
 * comportamiento del sistema para todos, no solo para un comensal.
 *
 * `lectura` no escribe nada. Ni siquiera exporta: un CSV con los WhatsApp de
 * todos los comensales es exactamente el dato que no debe salir sin control.
 */
const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: [
    'premios.gestionar', 'canjes.emitir', 'canjes.entregar', 'canjes.anular',
    'puntos.ajustar', 'desafios.gestionar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.activar', 'campanas.probar',
    'qr.gestionar', 'qr.redirigir',
    'agente.aprobar', 'agente.calibrar', 'agente.sandbox',
    'datos.exportar', 'usuarios.gestionar',
  ],
  comercial: [
    'canjes.emitir', 'canjes.entregar',
    'comensales.editar', 'consentimientos.revocar', 'resenas.moderar',
    'campanas.editar', 'campanas.probar',
    'qr.gestionar',
    'datos.exportar',
  ],
  lectura: [],
};

/** Cualquier valor que no sea un rol conocido se trata como `lectura`. */
export function rolValido(valor: unknown): Rol {
  return valor === 'admin' || valor === 'comercial' ? valor : 'lectura';
}

export function puede(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

export function permisosDe(rol: Rol): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol];
}

export const ETIQUETAS_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  lectura: 'Solo lectura',
};

/** Se lanza cuando falta un permiso. La capturan las Server Actions. */
export class SinPermiso extends Error {
  constructor(public readonly permiso: Permiso, public readonly rol: Rol) {
    super(`El rol "${rol}" no puede "${permiso}"`);
    this.name = 'SinPermiso';
  }
}
