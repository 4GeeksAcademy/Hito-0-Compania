'use client';

import type { CandidateStage, CandidateStatus } from '@/src/types/tracker';

interface CandidateFilterCopy {
  searchPlaceholder: string;
  statusLabel: string;
  allStatuses: string;
  stageLabel: string;
  allStages: string;
  activeOnly: string;
  withoutNotes: string;
  resetFilters: string;
  exportCsv: string;
}

interface CandidateFiltersProps {
  copy: CandidateFilterCopy;
  searchTerm: string;
  status: string;
  stage: string;
  activeOnly: boolean;
  withoutNotes: boolean;
  exportDisabled: boolean;
  statusOptions: CandidateStatus[];
  stageOptions: CandidateStage[];
  getStatusLabel: (status: CandidateStatus) => string;
  getStageLabel: (stage: CandidateStage) => string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onToggleActiveOnly: () => void;
  onToggleWithoutNotes: () => void;
  onReset: () => void;
  onExport: () => void;
}

export default function CandidateFilters({
  copy,
  searchTerm,
  status,
  stage,
  activeOnly,
  withoutNotes,
  exportDisabled,
  statusOptions,
  stageOptions,
  getStatusLabel,
  getStageLabel,
  onSearchChange,
  onStatusChange,
  onStageChange,
  onToggleActiveOnly,
  onToggleWithoutNotes,
  onReset,
  onExport,
}: CandidateFiltersProps) {
  return (
    <section id="candidates" className="grid w-full grid-cols-1 gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="relative w-full">
        <svg aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="candidate-search"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all hover:bg-slate-50 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder={copy.searchPlaceholder}
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex w-full items-center gap-2 sm:w-auto">
          <span className="whitespace-nowrap text-[11px] font-semibold tracking-wider text-slate-500">{copy.statusLabel}</span>
          <select
            className="w-full min-w-[155px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-auto"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="">{copy.allStatuses}</option>
            {statusOptions.map((option) => <option key={option} value={option}>{getStatusLabel(option)}</option>)}
          </select>
        </label>

        <label className="flex w-full items-center gap-2 sm:w-auto">
          <span className="whitespace-nowrap text-[11px] font-semibold tracking-wider text-slate-500">{copy.stageLabel}</span>
          <select
            className="w-full min-w-[155px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-auto"
            value={stage}
            onChange={(event) => onStageChange(event.target.value)}
          >
            <option value="">{copy.allStages}</option>
            {stageOptions.map((option) => <option key={option} value={option}>{getStageLabel(option)}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={activeOnly}
            onClick={onToggleActiveOnly}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${activeOnly ? 'border-[#4b43ef]/20 bg-[#eeedff] text-[#3f37d8]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            {copy.activeOnly}
          </button>
          <button
            type="button"
            aria-pressed={withoutNotes}
            onClick={onToggleWithoutNotes}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${withoutNotes ? 'border-[#4b43ef]/20 bg-[#eeedff] text-[#3f37d8]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            {copy.withoutNotes}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            <span aria-hidden="true">↺</span>{copy.resetFilters}
          </button>
          <button type="button" onClick={onExport} disabled={exportDisabled} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            <span aria-hidden="true">↓</span>{copy.exportCsv}
          </button>
        </div>
      </div>
    </section>
  );
}