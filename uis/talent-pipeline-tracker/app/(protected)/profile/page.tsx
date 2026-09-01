'use client';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { useAuth } from '@/src/context/AuthContext';

export default function ProfilePage() {
  const { user, loading, error, logout } = useAuth();

  return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Cabecera */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
          <p className="mt-1 text-sm text-gray-500">
            Datos de tu cuenta y sesión actual
          </p>
        </div>

        {error && <FeedbackAlert message={error} variant="error" className="mb-6" />}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Cargando perfil…</p>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Tarjeta de sesión */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de la cuenta</h2>

              <dl className="divide-y divide-gray-100">
                <div className="flex justify-between py-3">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user.email}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-sm font-medium text-gray-500">Rol</dt>
                  <dd className="text-sm text-gray-900 capitalize">{user.role}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-sm font-medium text-gray-500">ID de usuario</dt>
                  <dd className="text-sm font-mono text-gray-500">{user.id}</dd>
                </div>
              </dl>
            </div>

            {/* Tarjeta de perfil */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos personales</h2>

              {user.profile ? (
                <dl className="divide-y divide-gray-100">
                  <div className="flex justify-between py-3">
                    <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                    <dd className="text-sm text-gray-900">
                      {user.profile.name || <span className="italic text-gray-400">No especificado</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                    <dd className="text-sm text-gray-900">
                      {user.profile.phone || <span className="italic text-gray-400">No especificado</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between py-3">
                    <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                    <dd className="text-sm text-gray-900">
                      {user.profile.address || <span className="italic text-gray-400">No especificado</span>}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No hay datos de perfil disponibles.
                </p>
              )}
            </div>

            {/* Cerrar sesión */}
            <div className="flex justify-center pt-4">
              <button
                onClick={logout}
                className="rounded-lg border border-red-300 bg-white px-6 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : null}
      </div>
  );
}