'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';
  
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginAction(password);
      
      if (result.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(result.error || 'Token inválido');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔐 SIGH_FOOD Admin</h1>
          <p className="text-gray-400">Acceso restringido al equipo de ventas</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
          <div className="mb-6">
            <label htmlFor="token" className="block text-sm font-medium text-gray-300 mb-2">
              Token de Administrador
            </label>
            <input
              id="token"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
              placeholder="Ingresa el token de acceso"
            />
          </div>

          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-200 text-sm">⚠ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-lg ${
              isSubmitting
                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isSubmitting ? 'Verificando...' : 'Acceder al Dashboard'}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              ¿No tienes el token? Contacta al administrador del sistema.
            </p>
          </div>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Volver al sitio público
          </a>
        </div>
      </div>
    </div>
  );
}