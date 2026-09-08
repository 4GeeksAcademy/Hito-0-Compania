'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { forgotPassword } from '@/src/services/auth';

const CONFIRMATION_MESSAGE =
  'Si esa dirección está registrada, recibirás un enlace en breve.';

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
      // El backend siempre responde 200; el envío queda deshabilitado tras completarse.
      setSubmitted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar la solicitud';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-[#e8edff] flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Ingresá tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 px-6 py-8 sm:px-10">
          {submitted ? (
            <FeedbackAlert message={CONFIRMATION_MESSAGE} variant="success" />
          ) : (
            <>
              {error && (
                <div className="mb-6">
                  <FeedbackAlert message={error} variant="error" />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 w-full">
                <div className="w-full">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="ej: usuario@ejemplo.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#152a6b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace de restablecimiento'}
                </button>
              </form>
            </>
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
