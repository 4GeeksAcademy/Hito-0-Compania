'use client';

import { type FormEvent, useState } from 'react';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { changePassword, ValidationError } from '@/src/services/auth';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message =
        err instanceof ValidationError || err instanceof Error
          ? err.message
          : 'No se pudo actualizar la contraseña.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  const labelClass = 'block text-sm font-medium text-gray-700';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ingresá tu contraseña actual y elegí una nueva
        </p>
      </div>

      {error && <FeedbackAlert message={error} variant="error" className="mb-6" />}
      {success && <FeedbackAlert message={success} variant="success" className="mb-6" />}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className={labelClass}>
              Contraseña actual
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-password" className={labelClass}>
              Nueva contraseña
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {loading ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
