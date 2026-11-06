'use client';

import type { Dispatch, FormEventHandler, SetStateAction } from 'react';

import FeedbackAlert from '@/src/components/FeedbackAlert';

export interface CandidateFormData {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string;
  cv_url: string;
  experience_years: string;
}

interface CandidateModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  success: string | null;
  formData: CandidateFormData;
  setFormData: Dispatch<SetStateAction<CandidateFormData>>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
}

const inputClass = 'w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function CandidateModal({
  open,
  submitting,
  error,
  success,
  formData,
  setFormData,
  onSubmit,
  onClose,
}: CandidateModalProps) {
  if (!open) return null;

  function updateField(field: keyof CandidateFormData, value: string) {
    setFormData((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 p-4 sm:p-6">
      <button
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/50"
        disabled={submitting}
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="candidate-modal-title"
        aria-modal="true"
        className="relative mx-auto mt-8 max-h-[90vh] w-[min(92vw,42rem)] overflow-hidden rounded-xl bg-white shadow-2xl sm:mt-12"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
          <h2 id="candidate-modal-title" className="text-base font-bold text-gray-900 sm:text-lg">
            Registrar nueva candidatura
          </h2>
          <button
            aria-label="Cerrar modal"
            className="h-9 w-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-64px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {error ? <FeedbackAlert message={error} variant="error" className="mb-4 px-3 py-2" /> : null}
          {success ? <FeedbackAlert message={success} variant="success" className="mb-4 px-3 py-2" /> : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="sr-only">Nombre completo</span>
                <input className={inputClass} placeholder="Nombre completo *" required value={formData.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="sr-only">Email</span>
                <input className={inputClass} placeholder="Email *" required type="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
              </label>
              <label>
                <span className="sr-only">Teléfono</span>
                <input className={inputClass} placeholder="Teléfono *" required type="tel" value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </label>
              <label>
                <span className="sr-only">Años de experiencia</span>
                <input className={inputClass} min={0} placeholder="Años de experiencia *" required type="number" value={formData.experience_years} onChange={(event) => updateField('experience_years', event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="sr-only">Puesto</span>
                <input className={inputClass} placeholder="Puesto *" required value={formData.position} onChange={(event) => updateField('position', event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="sr-only">LinkedIn</span>
                <input className={inputClass} placeholder="LinkedIn" type="url" value={formData.linkedin_url} onChange={(event) => updateField('linkedin_url', event.target.value)} />
              </label>
              <label className="sm:col-span-2">
                <span className="sr-only">Enlace al CV</span>
                <input className={inputClass} placeholder="Enlace al CV" type="url" value={formData.cv_url} onChange={(event) => updateField('cv_url', event.target.value)} />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button className="w-full rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 sm:w-auto" disabled={submitting} onClick={onClose} type="button">
                Cancelar
              </button>
              <button className="w-full rounded-lg bg-[#4b43ef] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3f37d8] disabled:opacity-70 sm:w-auto" disabled={submitting} type="submit">
                {submitting ? 'Guardando...' : 'Registrar candidatura'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}