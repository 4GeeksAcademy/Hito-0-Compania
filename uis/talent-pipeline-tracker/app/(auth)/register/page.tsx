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
      <span className="material-symbols-outlined text-[14px] text-red-400 shrink-0">error</span>
      {fieldErrors[field]}
    </p>
  );
}

export default function RegisterPage() {
  const { register, error, loading, fieldErrors } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (password !== confirmPassword) {
      setFieldError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setFieldError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    await register({
      email,
      password,
      name: name.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    });
  };

  const inputBase =
    'block w-full rounded-xl border px-4 py-3 pl-11 text-sm shadow-sm placeholder:text-gray-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all duration-200';
  const inputNormal = inputBase + ' border-gray-200 bg-white text-gray-900';
  const inputError = inputBase + ' border-red-400 bg-red-50/80 text-gray-900';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f0f4ff] to-[#e8edff] flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#152a6b] shadow-lg mb-3 shrink-0">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Talent Pipeline Tracker
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Creá tu cuenta y empezá a gestionar el proceso de selección de tus candidatos de forma simple y eficiente.
          </p>
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
            <span><strong className="text-[#1e3a8a]">100+</strong> <span className="text-gray-500">Empresas</span></span>
            <span className="text-gray-300">|</span>
            <span><strong className="text-[#1e3a8a]">10K+</strong> <span className="text-gray-500">Candidatos</span></span>
            <span className="text-gray-300">|</span>
            <span><strong className="text-[#1e3a8a]">98%</strong> <span className="text-gray-500">Satisfacción</span></span>
          </div>
        </div>

          {/* Tarjeta del formulario */}
          <div className="w-full bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 px-6 py-8 sm:px-10 sm:py-12">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Crear cuenta
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Registrate para empezar a gestionar candidatos
              </p>
            </div>

            {!hasFieldErrors && (fieldError || error) && (
              <div className="mb-6">
                <FeedbackAlert message={fieldError || error!} variant="error" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 w-full">
              {/* Email */}
              <div className="w-full">
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    mail
                  </span>
                  <input
                    id="reg-email"
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
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    lock
                  </span>
                  <input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldErrors.password ? inputError : inputNormal}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <FieldError field="password" />
              </div>

              {/* Confirmar contraseña */}
              <div className="w-full">
                <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    verified_user
                  </span>
                  <input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputNormal}
                    placeholder="Repetí la contraseña"
                  />
                </div>
              </div>

              {/* Separador Perfil */}
              <div className="relative my-6 w-full">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs text-gray-500 font-medium">Opcionales de perfil</span>
                </div>
              </div>

              {/* Nombre */}
              <div className="w-full">
                <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    person
                  </span>
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldErrors.name ? inputError : inputNormal}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <FieldError field="name" />
              </div>

              {/* Teléfono */}
              <div className="w-full">
                <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Teléfono
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    phone
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldErrors.phone ? inputError : inputNormal}
                    placeholder="Ej: +54 11 5555-5555"
                  />
                </div>
                <FieldError field="phone" />
              </div>

              {/* Dirección */}
              <div className="w-full">
                <label htmlFor="reg-address" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dirección
                </label>
                <div className="relative w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[20px]">
                    home
                  </span>
                  <input
                    id="reg-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={fieldErrors.address ? inputError : inputNormal}
                    placeholder="Ej: Av. Siempre Viva 123"
                  />
                </div>
                <FieldError field="address" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#152a6b] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 hover:from-[#1a3378] hover:to-[#11245a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creando cuenta…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Crear cuenta
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-8">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="font-semibold text-[#1e3a8a] hover:text-[#152a6b] hover:underline underline-offset-2 transition-all">
                Iniciá sesión
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