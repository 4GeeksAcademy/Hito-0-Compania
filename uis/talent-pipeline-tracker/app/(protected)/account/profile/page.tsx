'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { useAuth } from '@/src/context/AuthContext';

export default function AccountProfilePage() {
  const { user, loading, error, fieldErrors, updateProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const justSavedRef = useRef(false);

  // Mostrar mensaje de éxito cuando la actualización se completa sin errores
  useEffect(() => {
    if (justSavedRef.current && !saving) {
      justSavedRef.current = false;
      if (!error && Object.keys(fieldErrors).length === 0) {
        setSuccess('Perfil actualizado correctamente');
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  }, [saving, error, fieldErrors]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Sincronizar estado local con los datos del usuario
  useEffect(() => {
    if (user?.profile) {
      setName(user.profile.name ?? '');
      setPhone(user.profile.phone ?? '');
      setAddress(user.profile.address ?? '');
    } else if (user) {
      setName('');
      setPhone('');
      setAddress('');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);

    await updateProfile({
      name: name.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });

    justSavedRef.current = true;
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    // Restaurar valores originales
    if (user?.profile) {
      setName(user.profile.name ?? '');
      setPhone(user.profile.phone ?? '');
      setAddress(user.profile.address ?? '');
    }
    setEditing(false);
  };

  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  const inputErrorClass =
    inputClass +
    ' border-red-400 focus:border-red-500 focus:ring-red-500';

  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Cabecera */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
            <p className="mt-1 text-sm text-gray-500">
              Administrá tus datos personales
            </p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Editar perfil
            </button>
          )}
        </div>

        {/* Feedback */}
        {error && Object.keys(fieldErrors).length === 0 && (
          <FeedbackAlert message={error} variant="error" className="mb-6" />
        )}
        {success && (
          <FeedbackAlert message={success} variant="success" className="mb-6" />
        )}

        {loading && !user ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Cargando perfil…</p>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Tarjeta: Email (solo lectura) */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Información de la cuenta
              </h2>
              <dl className="divide-y divide-gray-100">
                <div className="flex justify-between py-3">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{user.email}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-sm font-medium text-gray-500">Rol</dt>
                  <dd className="text-sm text-gray-900 capitalize">{user.role}</dd>
                </div>
              </dl>
            </div>

            {/* Tarjeta: Datos personales */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editing ? 'Editar datos personales' : 'Datos personales'}
              </h2>

              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label htmlFor="profile-name" className={labelClass}>
                      Nombre completo
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldErrors.name ? inputErrorClass : inputClass}
                      placeholder="Ej: Juan Pérez"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label htmlFor="profile-phone" className={labelClass}>
                      Teléfono
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={fieldErrors.phone ? inputErrorClass : inputClass}
                      placeholder="Ej: +54 11 5555-5555"
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                    )}
                  </div>

                  {/* Dirección */}
                  <div>
                    <label htmlFor="profile-address" className={labelClass}>
                      Dirección
                    </label>
                    <input
                      id="profile-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={fieldErrors.address ? inputErrorClass : inputClass}
                      placeholder="Ej: Av. Siempre Viva 123"
                    />
                    {fieldErrors.address && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.address}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {user.profile ? (
                    <dl className="divide-y divide-gray-100">
                      <div className="flex justify-between py-3">
                        <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                        <dd className="text-sm text-gray-900">
                          {user.profile.name || (
                            <span className="italic text-gray-400">No especificado</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                        <dd className="text-sm text-gray-900">
                          {user.profile.phone || (
                            <span className="italic text-gray-400">No especificado</span>
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                        <dd className="text-sm text-gray-900">
                          {user.profile.address || (
                            <span className="italic text-gray-400">No especificada</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No hay datos de perfil disponibles.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Cerrar sesión */}
            {!editing && (
              <div className="flex justify-center gap-3 pt-4">
                <Link
                  href="/account/change-password"
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                  Cambiar contraseña
                </Link>
                <LogoutButton />
              </div>
            )}
          </div>
        ) : null}
      </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="rounded-lg border border-red-300 bg-white px-6 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
    >
      Cerrar sesión
    </button>
  );
}