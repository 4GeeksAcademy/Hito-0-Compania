'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { useAuth } from '@/src/context/AuthContext';

function FieldError({ field }: { field: string }) {
  const { fieldErrors } = useAuth();
  if (!fieldErrors[field]) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      {/* Icono SVG de Error */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 shrink-0">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {fieldErrors[field]}
    </p>
  );
}

export default function LoginPage() {
  const { login, error, loading, fieldErrors } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  const inputBase =
    'block w-full rounded-xl border px-4 py-3 pl-11 text-sm shadow-sm placeholder:text-gray-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200';
  const inputNormal = inputBase + ' border-gray-200 bg-white text-gray-900';
  const inputError = inputBase + ' border-red-400 bg-red-50/80 text-gray-900';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-[#e8edff] flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#152a6b] shadow-lg mb-3 shrink-0">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Talent Pipeline Tracker
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Gestioná tus candidatos, seguí su progreso y tomá decisiones en cada etapa del proceso de selección.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
            <span><strong className="text-[#1e3a8a]">100+</strong> <span className="text-gray-500">Empresas</span></span>
            <span className="text-gray-300">|</span>
            <span><strong className="text-[#1e3a8a]">10K+</strong> <span className="text-gray-500">Candidatos</span></span>
            <span className="text-gray-300">|</span>
            <span><strong className="text-[#1e3a8a]">98%</strong> <span className="text-gray-500">Satisfacción</span></span>
          </div>
        </div>

          {/* Tarjeta Blanca */}
          <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Accedé a tu cuenta para gestionar candidatos
              </p>
            </div>

            {error && (
              <div className="mb-6">
                <FeedbackAlert message={error} variant="error" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 w-full">
              {/* Email */}
              <div className="w-full">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative w-full">
                  {/* Icono SVG en lugar de fuente de Google */}
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
                    className={fieldErrors.email ? inputError : inputNormal}
                    placeholder="ej: usuario@ejemplo.com"
                  />
                </div>
                <FieldError field="email" />
              </div>

              {/* Contraseña */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                </div>
                <div className="relative w-full">
                  {/* Icono SVG en lugar de fuente de Google */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldErrors.password ? inputError : inputNormal}
                    placeholder="••••••••"
                  />
                </div>
                <FieldError field="password" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#152a6b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 hover:from-[#1a3378] hover:to-[#11245a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ingresando…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Iniciar sesión
                    {/* Icono Flecha SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="relative my-8 w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-gray-500 font-medium">O continuá con</span>
              </div>
            </div>

            {/* Botones sociales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.98] w-full"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.98] w-full"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all">
                Registrate gratis
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6 w-full">
            &copy; {new Date().getFullYear()} Talent Pipeline Tracker. Todos los derechos reservados.
          </p>
        </div>
      </div>
  );
}