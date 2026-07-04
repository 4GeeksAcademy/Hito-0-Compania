'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { trackerApi } from '@/services/api';
import type { CandidateRecord, CandidateStage, CandidateStatus, Note } from '@/src/types/tracker';

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
    experienceLabel: 'Experiencia:',
    appliedLabel: 'Aplico:',
    years: 'anos',
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
    experienceLabel: 'Experience:',
    appliedLabel: 'Applied:',
    years: 'years',
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

export default function CandidateDetailPage() {
  const { id } = useParams();
  const candidateId = Array.isArray(id) ? id[0] : id;
  const [locale, setLocale] = useState<Locale>('es');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
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

        setCandidate(candidateData);
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

  async function handleStatusChange(nextStatus: CandidateStatus) {
    if (!candidateId || !candidate) return;

    setSavingStatus(true);
    setError(null);

    try {
      const updated = await trackerApi.updateCandidateFields(candidateId, { status: nextStatus });
      setCandidate(updated);
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

    try {
      const updated = await trackerApi.updateCandidateFields(candidateId, { stage: nextStage });
      setCandidate(updated);
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

    try {
      await trackerApi.createNote(candidateId, content);
      const updatedNotes = await trackerApi.getNotes(candidateId);
      setNotes(updatedNotes);
      setNoteText('');
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

    try {
      await trackerApi.deleteNote(candidateId, noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
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
