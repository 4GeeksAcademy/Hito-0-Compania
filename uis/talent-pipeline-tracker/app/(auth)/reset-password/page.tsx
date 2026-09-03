'use client';

import { Suspense, type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { resetPassword, ValidationError } from '@/src/services/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El enlace de restablecimiento no es válido. Solicitá uno nuevo.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      router.push('/login?resetSuccess=1');
    } catch (err) {
      const message =
        err instanceof ValidationError || err instanceof Error
          ? err.message
          : 'No se pudo restablecer la contraseña.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'block w-full rounded-xl border px-4 py-3 pl-11 text-sm shadow-sm placeholder:text-gray-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200 ' +
    'border-gray-200 bg-white text-gray-900';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-[#e8edff] flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#152a6b] shadow-lg mb-3 shrink-0">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Restablecer contraseña
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Elegí una nueva contraseña para tu cuenta.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 px-6 py-8 sm:px-10 sm:py-12">
          {error && (
            <div className="mb-6">
              <FeedbackAlert message={error} variant="error" />
              <p className="mt-2 text-sm text-gray-500">
                <Link href="/forgot-password" className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all">
                  Solicitar un nuevo enlace de restablecimiento
                </Link>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div className="w-full">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative w-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputBase}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="w-full">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative w-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputBase}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#152a6b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 hover:from-[#1a3378] hover:to-[#11245a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? 'Restableciendo…' : 'Restablecer contraseña'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            <Link href="/login" className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
