'use client';

import { type FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

function LoginForm() {
  const { login, error, loading, fieldErrors } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('resetSuccess') === '1';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  const inputBase =
    'block w-full rounded-lg border px-4 py-2.5 pl-11 text-sm shadow-sm placeholder:text-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200';
  const inputNormal = inputBase + ' border-gray-200 bg-white text-gray-900';
  const inputError = inputBase + ' border-red-400 bg-red-50/80 text-gray-900';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-[#e8edff] flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        
        {/* Branding */}
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10182e] text-white shadow-md">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8zm12-4a4 4 0 01-3 3.87" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Talent Pipeline <span className="text-indigo-600">Tracker</span>
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Gestioná tus candidatos, seguí su progreso y tomá decisiones en cada etapa del proceso de selección.
          </p>
        </div>

          <div className="w-full rounded-xl border border-slate-200 bg-white px-6 py-7 shadow-lg shadow-slate-900/5 sm:px-8">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Iniciar sesión
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Accedé a tu cuenta para gestionar candidatos
              </p>
            </div>

            {resetSuccess && (
              <div className="mb-6">
                <FeedbackAlert
                  message="Tu contraseña fue actualizada. Iniciá sesión con la nueva contraseña."
                  variant="success"
                />
              </div>
            )}

            {error && (
              <div className="mb-6">
                <FeedbackAlert message={error} variant="error" />
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all"
                  >
                    Reintentar
                  </button>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all"
                  >
                    ¿Problemas para ingresar? Restablecé tu contraseña
                  </Link>
                </div>
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
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative w-full">
                  {/* Icono SVG en lugar de fuente de Google */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${fieldErrors.password ? inputError : inputNormal} pr-12`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.7 10.7 0 0112 5c5 0 9 4.5 10 7a11 11 0 01-3.1 4.4M6.2 6.2C3.9 7.6 2.5 10 2 12c.5 2.5 4.5 7 10 7 1.2 0 2.3-.2 3.3-.6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></svg>
                    ) : (
                      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" strokeWidth="1.7" /></svg>
                    )}
                  </button>
                </div>
                <FieldError field="password" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#10182e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d2946] focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
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

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿No tenés cuenta?{' '}
              <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 transition-all">
                Registrate gratis
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-1 w-full text-center text-xs text-slate-400">
            TrackFlow Tech · Acceso interno al pipeline de talento
          </p>
        </div>
      </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}