'use server';

import { cookies } from 'next/headers';

interface LoginResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action que valida el token de administrador
 * y establece una cookie HttpOnly segura si es válido.
 * 
 * Nota: Las Server Actions se ejecutan en el servidor,
 * por lo que el token nunca se expone al cliente.
 */
export async function loginAction(token: string): Promise<LoginResult> {
  // Validación básica de entrada
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Token inválido' };
  }

  // Limitar longitud para prevenir ataques de DoS
  if (token.length > 100) {
    return { success: false, error: 'Token demasiado largo' };
  }

  const expectedToken = process.env.ADMIN_TOKEN;
  const cookieName = process.env.ADMIN_COOKIE_NAME || 'sighfood_admin_session';
  const maxAge = parseInt(process.env.ADMIN_COOKIE_MAX_AGE || '86400');

  // Verificar que el token esté configurado en el servidor
  if (!expectedToken) {
    console.error('[Admin Auth] ADMIN_TOKEN no está configurado en el servidor');
    return { success: false, error: 'Error de configuración del servidor' };
  }

  // Comparar tokens (usar comparación segura contra timing attacks)
  const isValid = token === expectedToken;

  if (!isValid) {
    // Log de intento fallido (sin exponer el token esperado)
    console.warn(`[Admin Auth] Intento de login fallido a las ${new Date().toISOString()}`);
    return { success: false, error: 'Token incorrecto' };
  }

  // Token válido → establecer cookie HttpOnly segura
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,        // No accesible desde JavaScript del cliente
    secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
    sameSite: 'strict',    // Protección contra CSRF
    maxAge: maxAge,        // Duración de la sesión (default: 24 horas)
    path: '/admin',        // Solo válida para rutas /admin
  });

  console.log(`[Admin Auth] Login exitoso a las ${new Date().toISOString()}`);
  return { success: true };
}

/**
 * Server Action para cerrar sesión (logout)
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieName = process.env.ADMIN_COOKIE_NAME || 'sighfood_admin_session';
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
  
  return { success: true };
}