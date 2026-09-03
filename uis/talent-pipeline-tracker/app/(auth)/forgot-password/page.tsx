'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { forgotPassword } from '@/src/services/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
    } catch {
      // No exponer detalles al usuario: igual mostramos el mensaje de confirmación.
    } finally {
      setLoading(false);
      setSubmitted(true);
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
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Recuperar contraseña
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 px-6 py-8 sm:px-10 sm:py-12">
          {submitted ? (
            <FeedbackAlert
              variant="success"
              message="Si esa dirección está en nuestro sistema, recibirás un enlace de restablecimiento en tu email."
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 w-full">
              {error && <FeedbackAlert message={error} variant="error" />}

              <div className="w-full">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputBase}
                    placeholder="ej: usuario@ejemplo.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#152a6b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 hover:from-[#1a3378] hover:to-[#11245a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? 'Enviando…' : 'Enviar enlace de restablecimiento'}
              </button>
            </form>
          )}

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
