'use client';

import Link from 'next/link';

import type { CandidateRecord, CandidateStage, CandidateStatus } from '@/src/types/tracker';
import type { LocationHub } from '@/src/context/LocationContext';

interface CandidateResultsCopy {
  loading: string;
  noResults: string;
  tableName: string;
  tablePosition: string;
  tableStatus: string;
  tableStage: string;
  tableActions: string;
  viewDetails: string;
  showing: string;
  of: string;
  candidatesTotal: string;
  page: string;
}

interface CandidateResultsProps {
  copy: CandidateResultsCopy;
  locale: 'es' | 'en';
  loading: boolean;
  candidates: CandidateRecord[];
  visibleCount: number;
  pageStart: number;
  currentPage: number;
  pageCount: number;
  pageButtons: Array<number | 'ellipsis'>;
  candidateCityMap: Record<string, LocationHub>;
  getStatusClass: (status: CandidateStatus) => string;
  getStageClass: (stage: CandidateStage) => string;
  getStatusLabel: (status: CandidateStatus) => string;
  getStageLabel: (stage: CandidateStage) => string;
  getInitials: (name: string) => string;
  getAvatarClass: (name: string) => string;
  getLocation: (candidate: CandidateRecord, mappedCities: Record<string, LocationHub>) => string | null;
  onPageChange: (page: number) => void;
}

export default function CandidateResults({
  copy,
  locale,
  loading,
  candidates,
  visibleCount,
  pageStart,
  currentPage,
  pageCount,
  pageButtons,
  candidateCityMap,
  getStatusClass,
  getStageClass,
  getStatusLabel,
  getStageLabel,
  getInitials,
  getAvatarClass,
  getLocation,
  onPageChange,
}: CandidateResultsProps) {
  const previousLabel = locale === 'es' ? 'Anterior' : 'Previous';
  const nextLabel = locale === 'es' ? 'Siguiente' : 'Next';
  const start = candidates.length ? pageStart + 1 : 0;
  const end = pageStart + candidates.length;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="hidden w-full min-w-[980px] border-collapse text-left md:table">
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              <th className="px-lg py-4 text-label-sm font-label-sm uppercase tracking-wider text-outline">{copy.tableName}</th>
              <th className="px-lg py-4 text-label-sm font-label-sm uppercase tracking-wider text-outline">{copy.tablePosition}</th>
              <th className="px-lg py-4 text-label-sm font-label-sm uppercase tracking-wider text-outline">{copy.tableStatus}</th>
              <th className="px-lg py-4 text-label-sm font-label-sm uppercase tracking-wider text-outline">{copy.tableStage}</th>
              <th className="px-lg py-4 text-right text-label-sm font-label-sm uppercase tracking-wider text-outline">{copy.tableActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {loading ? (
              <tr><td className="px-lg py-10" colSpan={5}><div className="flex items-center justify-center gap-sm text-on-surface-variant"><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-container-high border-t-primary" /><span className="text-body-md">{copy.loading}</span></div></td></tr>
            ) : null}
            {!loading && candidates.length === 0 ? (
              <tr><td className="px-lg py-10 text-center text-body-md text-on-surface-variant" colSpan={5}>{copy.noResults}</td></tr>
            ) : null}
            {!loading ? candidates.map((candidate) => {
              const location = getLocation(candidate, candidateCityMap);
              return (
                <tr key={candidate.id} className="group transition-colors hover:bg-background">
                  <td className="px-lg py-4">
                    <div className="flex items-center gap-md">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${getAvatarClass(candidate.full_name)}`} aria-hidden="true">{getInitials(candidate.full_name)}</div>
                      <div className="min-w-0">
                        <p className="truncate text-body-md font-bold text-on-surface">{candidate.full_name}</p>
                        <p className="truncate text-label-sm font-label-sm text-on-surface-variant">{candidate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-lg py-4">
                    <p className="text-body-md font-medium text-on-surface-variant">{candidate.position}</p>
                    {location ? <p className="text-label-sm font-label-sm text-outline">⌖ {location}</p> : null}
                  </td>
                  <td className="px-lg py-4"><span className={`inline-flex items-center rounded-full px-3 py-1 text-label-md font-label-md ${getStatusClass(candidate.status)}`}>{getStatusLabel(candidate.status)}</span></td>
                  <td className="px-lg py-4"><span className={`inline-flex items-center rounded-full px-3 py-1 text-label-md font-label-md ${getStageClass(candidate.stage)}`}>{getStageLabel(candidate.stage)}</span></td>
                  <td className="px-lg py-4 text-right"><Link className="text-label-md font-bold text-primary hover:underline" href={`/candidates/${candidate.id}`}>{copy.viewDetails}</Link></td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
      </div>

      <div className="block space-y-2 p-2 md:hidden">
        {loading ? <p className="p-4 text-body-md text-on-surface-variant" role="status">{copy.loading}</p> : null}
        {!loading && candidates.length === 0 ? <p className="p-4 text-center text-body-md text-on-surface-variant">{copy.noResults}</p> : null}
        {!loading ? candidates.map((candidate) => {
          const location = getLocation(candidate, candidateCityMap);
          return (
            <article key={candidate.id} className="block w-full max-w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm ${getAvatarClass(candidate.full_name)}`} aria-hidden="true">{getInitials(candidate.full_name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md font-bold text-on-surface">{candidate.full_name}</p>
                  <p className="truncate text-label-sm text-on-surface-variant">{candidate.email}</p>
                  <p className="mt-1 truncate text-label-sm text-outline">{candidate.position}</p>
                  {location ? <p className="truncate text-label-sm text-outline">⌖ {location}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-md font-label-md ${getStatusClass(candidate.status)}`}>{getStatusLabel(candidate.status)}</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-label-md font-label-md ${getStageClass(candidate.stage)}`}>{getStageLabel(candidate.stage)}</span>
              </div>
              <div className="mt-3"><Link className="text-label-md font-bold text-primary hover:underline" href={`/candidates/${candidate.id}`}>{copy.viewDetails}</Link></div>
            </article>
          );
        }) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface-container-low px-lg py-3">
        <p className="text-label-sm font-label-sm text-on-surface-variant">
          {copy.showing} {start}{candidates.length > 1 ? `–${end}` : ''} {copy.of} {visibleCount} {copy.candidatesTotal}
        </p>
        <nav className="flex items-center gap-1" aria-label={locale === 'es' ? 'Paginación de candidatos' : 'Candidate pagination'}>
          <button type="button" aria-label={previousLabel} className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>{previousLabel}</button>
          {pageButtons.map((page, index) => page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-400" aria-hidden="true">…</span>
          ) : (
            <button key={page} type="button" aria-label={`${copy.page} ${page}`} aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange(page)} className={`h-8 min-w-8 rounded-md px-2 text-xs font-medium ${page === currentPage ? 'bg-[#4b43ef] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{page}</button>
          ))}
          <button type="button" aria-label={nextLabel} className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}>{nextLabel}</button>
        </nav>
      </footer>
    </section>
  );
}