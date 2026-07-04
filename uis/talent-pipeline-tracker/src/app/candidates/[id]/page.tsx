'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { trackerApi } from '@/services/api';
import type { CandidateInput, CandidateRecord, CandidateStage, CandidateStatus, Note } from '@/src/types/tracker';

const STATUS_OPTIONS: CandidateStatus[] = [
  'pending',
  'reviewing',
  'interviewed',
  'offered',
  'rejected',
  'accepted',
];

const STAGE_OPTIONS: CandidateStage[] = [
  'screening',
  'technical',
  'cultural',
  'manager',
  'final',
];

const statusLabels = {
  es: {
    pending: 'Pendiente',
    reviewing: 'En revision',
    interviewed: 'Entrevistado',
    offered: 'Oferta enviada',
    rejected: 'Rechazado',
    accepted: 'Aceptado',
  },
  en: {
    pending: 'Pending',
    reviewing: 'Reviewing',
    interviewed: 'Interviewed',
    offered: 'Offered',
    rejected: 'Rejected',
    accepted: 'Accepted',
  },
} as const;

const stageLabels = {
  es: {
    screening: 'Cribado',
    technical: 'Tecnica',
    cultural: 'Cultural',
    manager: 'Manager',
    final: 'Final',
  },
  en: {
    screening: 'Screening',
    technical: 'Technical',
    cultural: 'Cultural',
    manager: 'Manager',
    final: 'Final',
  },
} as const;

type Locale = 'es' | 'en';

const dictionary = {
  es: {
    backToList: 'Volver al listado',
    loading: 'Cargando detalle del candidato...',
    statusLabel: 'Estado',
    stageLabel: 'Etapa',
    positionLabel: 'Puesto:',
    phoneLabel: 'Telefono:',
    linkedinLabel: 'LinkedIn:',
    cvLabel: 'Enlace CV:',
    experienceLabel: 'Experiencia:',
    appliedLabel: 'Aplico:',
    years: 'anos',
    editTitle: 'Editar candidatura',
    fullNameInput: 'Nombre completo *',
    emailInput: 'Email *',
    phoneInput: 'Telefono *',
    positionInput: 'Puesto *',
    linkedinInput: 'LinkedIn',
    cvInput: 'Enlace CV',
    experienceInput: 'Años de experiencia *',
    saveCandidate: 'Guardar cambios',
    saveCandidateSuccess: 'Candidatura actualizada correctamente.',
    saveCandidateError: 'No se pudo actualizar la candidatura.',
    statusUpdatedSuccess: 'Estado actualizado correctamente.',
    stageUpdatedSuccess: 'Etapa actualizada correctamente.',
    noteCreatedSuccess: 'Nota creada correctamente.',
    noteDeletedSuccess: 'Nota eliminada correctamente.',
    requiredValidation: 'Completa todos los campos requeridos antes de guardar.',
    experienceValidation: 'Los años de experiencia deben ser un número válido igual o mayor a 0.',
    notAvailable: 'No disponible',
    notesTitle: 'Historial de notas',
    notesCount: 'notas',
    emptyNotes: 'Aun no hay notas para este candidato.',
    deleteNote: 'Eliminar',
    newNote: 'Nueva nota',
    newNotePlaceholder: 'Escribe una observacion relevante del proceso...',
    saving: 'Guardando...',
    createNote: 'Crear nota',
    languageButton: 'EN',
  },
  en: {
    backToList: 'Back to list',
    loading: 'Loading candidate details...',
    statusLabel: 'Status',
    stageLabel: 'Stage',
    positionLabel: 'Position:',
    phoneLabel: 'Phone:',
    linkedinLabel: 'LinkedIn:',
    cvLabel: 'CV Link:',
    experienceLabel: 'Experience:',
    appliedLabel: 'Applied:',
    years: 'years',
    editTitle: 'Edit candidate',
    fullNameInput: 'Full name *',
    emailInput: 'Email *',
    phoneInput: 'Phone *',
    positionInput: 'Position *',
    linkedinInput: 'LinkedIn',
    cvInput: 'CV link',
    experienceInput: 'Years of experience *',
    saveCandidate: 'Save changes',
    saveCandidateSuccess: 'Candidate updated successfully.',
    saveCandidateError: 'Could not update candidate.',
    statusUpdatedSuccess: 'Status updated successfully.',
    stageUpdatedSuccess: 'Stage updated successfully.',
    noteCreatedSuccess: 'Note created successfully.',
    noteDeletedSuccess: 'Note deleted successfully.',
    requiredValidation: 'Complete all required fields before saving.',
    experienceValidation: 'Years of experience must be a valid number greater than or equal to 0.',
    notAvailable: 'Not available',
    notesTitle: 'Notes history',
    notesCount: 'notes',
    emptyNotes: 'There are no notes for this candidate yet.',
    deleteNote: 'Delete',
    newNote: 'New note',
    newNotePlaceholder: 'Write a relevant process note...',
    saving: 'Saving...',
    createNote: 'Create note',
    languageButton: 'ES',
  },
} as const;

function toLocaleCode(locale: Locale): string {
  return locale === 'es' ? 'es-ES' : 'en-US';
}

function formatDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleString(toLocaleCode(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const STATUS_OVERRIDE_STORAGE_KEY = 'tracker:status-overrides';

function readStatusOverrides(): Record<string, CandidateStatus> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STATUS_OVERRIDE_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, string>;
    const allowed: CandidateStatus[] = ['pending', 'reviewing', 'interviewed', 'offered', 'rejected', 'accepted'];
    const normalized: Record<string, CandidateStatus> = {};

    Object.entries(parsed).forEach(([id, status]) => {
      if (allowed.includes(status as CandidateStatus)) {
        normalized[id] = status as CandidateStatus;
      }
    });

    return normalized;
  } catch {
    return {};
  }
}

function saveStatusOverride(candidateId: string, status: CandidateStatus) {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readStatusOverrides();
  current[candidateId] = status;
  window.localStorage.setItem(STATUS_OVERRIDE_STORAGE_KEY, JSON.stringify(current));
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const candidateId = Array.isArray(id) ? id[0] : id;
  const [locale, setLocale] = useState<Locale>('es');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    linkedin_url: '',
    cv_url: '',
    experience_years: '',
  });
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [candidateFormError, setCandidateFormError] = useState<string | null>(null);
  const [candidateFormSuccess, setCandidateFormSuccess] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const t = dictionary[locale];

  function getStatusOptionLabel(status: CandidateStatus): string {
    return statusLabels[locale][status];
  }

  function getStageOptionLabel(stage: CandidateStage): string {
    return stageLabels[locale][stage];
  }

  function toggleLocale() {
    setLocale((prev) => (prev === 'es' ? 'en' : 'es'));
  }

  useEffect(() => {
    let active = true;

    async function load() {
      if (!candidateId) {
        setError('No se encontró el ID del candidato.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [candidateData, notesData] = await Promise.all([
          trackerApi.getCandidateById(candidateId),
          trackerApi.getNotes(candidateId),
        ]);

        if (!active) return;

        const statusOverrides = readStatusOverrides();
        const overriddenStatus = statusOverrides[candidateData.id];

        setCandidate(
          overriddenStatus
            ? { ...candidateData, status: overriddenStatus }
            : candidateData,
        );
        setNotes(notesData);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Error al cargar el candidato.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [candidateId]);

  useEffect(() => {
    if (!candidate) return;

    setCandidateForm({
      full_name: candidate.full_name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      linkedin_url: candidate.linkedin_url ?? '',
      cv_url: candidate.cv_url ?? '',
      experience_years: String(candidate.experience_years),
    });
  }, [candidate]);

  async function handleUpdateCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidateId || !candidate) return;

    setCandidateFormError(null);
    setCandidateFormSuccess(null);

    const requiredFields = [
      candidateForm.full_name,
      candidateForm.email,
      candidateForm.phone,
      candidateForm.position,
      candidateForm.experience_years,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setCandidateFormError(t.requiredValidation);
      return;
    }

    const experienceYears = Number(candidateForm.experience_years);
    if (!Number.isFinite(experienceYears) || experienceYears < 0) {
      setCandidateFormError(t.experienceValidation);
      return;
    }

    setSavingCandidate(true);

    const payload: CandidateInput = {
      full_name: candidateForm.full_name.trim(),
      email: candidateForm.email.trim(),
      phone: candidateForm.phone.trim(),
      position: candidateForm.position.trim(),
      linkedin_url: candidateForm.linkedin_url.trim() || null,
      cv_url: candidateForm.cv_url.trim() || '',
      experience_years: experienceYears,
      status: candidate.status,
      stage: candidate.stage,
    };

    try {
      const updated = await trackerApi.updateCandidate(candidateId, payload);
      setCandidate(updated);
      setCandidateFormSuccess(t.saveCandidateSuccess);
      setOperationSuccess(null);
    } catch (updateError) {
      setCandidateFormError(updateError instanceof Error ? updateError.message : t.saveCandidateError);
    } finally {
      setSavingCandidate(false);
    }
  }

  async function handleStatusChange(nextStatus: CandidateStatus) {
    if (!candidateId || !candidate) return;

    setSavingStatus(true);
    setError(null);
    setOperationSuccess(null);

    try {
      const updated = await trackerApi.updateCandidateFields(candidateId, { status: nextStatus });
      setCandidate({ ...updated, status: nextStatus });
      saveStatusOverride(candidateId, nextStatus);
      setOperationSuccess(t.statusUpdatedSuccess);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el estado.');
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleStageChange(nextStage: CandidateStage) {
    if (!candidateId || !candidate) return;

    setSavingStage(true);
    setError(null);
    setOperationSuccess(null);

    try {
      const updated = await trackerApi.updateCandidateFields(candidateId, { stage: nextStage });
      setCandidate(updated);
      setOperationSuccess(t.stageUpdatedSuccess);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la etapa.');
    } finally {
      setSavingStage(false);
    }
  }

  async function handleCreateNote() {
    if (!candidateId) return;

    const content = noteText.trim();
    if (!content) return;

    setSavingNote(true);
    setError(null);
    setOperationSuccess(null);

    try {
      await trackerApi.createNote(candidateId, content);
      const updatedNotes = await trackerApi.getNotes(candidateId);
      setNotes(updatedNotes);
      setNoteText('');
      setOperationSuccess(t.noteCreatedSuccess);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear la nota.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!candidateId) return;

    setDeletingNoteId(noteId);
    setError(null);
    setOperationSuccess(null);

    try {
      await trackerApi.deleteNote(candidateId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      setOperationSuccess(t.noteDeletedSuccess);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la nota.');
    } finally {
      setDeletingNoteId(null);
    }
  }

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [notes]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← {t.backToList}
          </Link>
          <button
            type="button"
            className="h-9 min-w-11 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-blue-700"
            onClick={toggleLocale}
          >
            {t.languageButton}
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
            {t.loading}
          </div>
        ) : null}

        {error ? (
          <FeedbackAlert message={error} variant="error" className="rounded-xl p-4" />
        ) : null}

        {operationSuccess ? (
          <FeedbackAlert message={operationSuccess} variant="success" />
        ) : null}

        {!loading && candidate ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 md:p-6 space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{candidate.full_name}</h1>
                <p className="mt-1 text-sm text-slate-600">{candidate.email}</p>
              </div>

              <div className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">{t.positionLabel}</span> {candidate.position}
                </p>
                <p>
                  <span className="font-semibold">{t.phoneLabel}</span> {candidate.phone}
                </p>
                <p>
                  <span className="font-semibold">{t.linkedinLabel}</span>{' '}
                  {candidate.linkedin_url ? (
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline break-all"
                    >
                      {candidate.linkedin_url}
                    </a>
                  ) : (
                    t.notAvailable
                  )}
                </p>
                <p>
                  <span className="font-semibold">{t.cvLabel}</span>{' '}
                  {candidate.cv_url ? (
                    <a
                      href={candidate.cv_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline break-all"
                    >
                      {candidate.cv_url}
                    </a>
                  ) : (
                    t.notAvailable
                  )}
                </p>
                <p>
                  <span className="font-semibold">{t.experienceLabel}</span> {candidate.experience_years} {t.years}
                </p>
                <p>
                  <span className="font-semibold">{t.appliedLabel}</span> {formatDate(candidate.applied_at, locale)}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  {t.statusLabel}
                  <select
                    value={candidate.status}
                    onChange={(event) => handleStatusChange(event.target.value as CandidateStatus)}
                    disabled={savingStatus}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {getStatusOptionLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  {t.stageLabel}
                  <select
                    value={candidate.stage}
                    onChange={(event) => handleStageChange(event.target.value as CandidateStage)}
                    disabled={savingStage}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  >
                    {STAGE_OPTIONS.map((stage) => (
                      <option key={stage} value={stage}>
                        {getStageOptionLabel(stage)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">{t.editTitle}</h2>

                {candidateFormError ? (
                  <FeedbackAlert message={candidateFormError} variant="error" />
                ) : null}

                {candidateFormSuccess ? (
                  <FeedbackAlert message={candidateFormSuccess} variant="success" />
                ) : null}

                <form className="space-y-2" onSubmit={handleUpdateCandidate}>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.full_name}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, full_name: event.target.value }))}
                    placeholder={t.fullNameInput}
                    type="text"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.email}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder={t.emailInput}
                    type="email"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.phone}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder={t.phoneInput}
                    type="tel"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.position}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, position: event.target.value }))}
                    placeholder={t.positionInput}
                    type="text"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.linkedin_url}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, linkedin_url: event.target.value }))}
                    placeholder={t.linkedinInput}
                    type="url"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.cv_url}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, cv_url: event.target.value }))}
                    placeholder={t.cvInput}
                    type="url"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    value={candidateForm.experience_years}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, experience_years: event.target.value }))}
                    placeholder={t.experienceInput}
                    type="number"
                    min={0}
                  />

                  <button
                    type="submit"
                    disabled={savingCandidate}
                    className="w-full sm:w-auto rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {savingCandidate ? t.saving : t.saveCandidate}
                  </button>
                </form>
              </div>
            </section>

            <section className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{t.notesTitle}</h2>
                <span className="text-sm text-slate-500">{sortedNotes.length} {t.notesCount}</span>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-auto pr-1">
                {sortedNotes.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    {t.emptyNotes}
                  </p>
                ) : (
                  sortedNotes.map((note) => (
                    <article
                      key={note.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                          <p className="mt-2 text-xs text-slate-500">{formatDate(note.created_at, locale)}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNoteId === note.id}
                          className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t.deleteNote}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <label className="block text-sm font-medium text-slate-700">{t.newNote}</label>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={4}
                  placeholder={t.newNotePlaceholder}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                />
                <button
                  onClick={handleCreateNote}
                  disabled={savingNote || noteText.trim().length === 0}
                  className="w-full sm:w-auto rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {savingNote ? t.saving : t.createNote}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
