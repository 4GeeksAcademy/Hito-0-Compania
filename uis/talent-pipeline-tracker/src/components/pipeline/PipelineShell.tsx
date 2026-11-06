'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import type { LocationHub } from '@/src/context/LocationContext';
import type { UserSession } from '@/src/types/auth';

interface PipelineShellCopy {
  appSubtitle: string;
  candidates: string;
  interviews: string;
  offers: string;
  settings: string;
  mobileMenu: string;
  closeMenu: string;
  languageButton: string;
  allLocations: string;
  newCandidate: string;
}

interface PipelineShellProps {
  copy: PipelineShellCopy;
  user: UserSession | null;
  location: LocationHub;
  candidateCount: number;
  interviewCount: number;
  offerCount: number;
  activeSection: 'candidates' | 'interviews' | 'offers';
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onLocationChange: (location: LocationHub) => void;
  onToggleLocale: () => void;
  onLogout: () => void;
  onCreateCandidate: () => void;
  children: ReactNode;
}

export default function PipelineShell({
  copy,
  user,
  location,
  candidateCount,
  interviewCount,
  offerCount,
  activeSection,
  menuOpen,
  onMenuOpenChange,
  onLocationChange,
  onToggleLocale,
  onLogout,
  onCreateCandidate,
  children,
}: PipelineShellProps) {
  function openCandidateModal() {
    onMenuOpenChange(false);
    onCreateCandidate();
  }

  function renderSidebar() {
    return (
      <>
        <div className="flex items-center gap-sm px-sm py-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4b43ef]">
            <span aria-hidden="true" className="text-[10px] font-black text-white">TF</span>
          </div>
          <div>
            <p className="whitespace-nowrap text-sm font-bold leading-tight text-white">TrackFlow Tech</p>
            <p className="text-[10px] text-slate-400">{copy.appSubtitle}</p>
          </div>
        </div>

        <nav className="mt-md flex flex-1 flex-col gap-xs">
          <Link onClick={() => onMenuOpenChange(false)} aria-current={activeSection === 'candidates' ? 'page' : undefined} className={`flex items-center gap-sm rounded-lg px-md py-sm transition-all active:scale-[0.98] ${activeSection === 'candidates' ? 'bg-[#29345d] text-white' : 'font-medium text-slate-300 hover:bg-white/5'}`} href="/">
            <span aria-hidden="true">♙</span><span className="text-label-md">{copy.candidates}</span>
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{candidateCount}</span>
          </Link>
          <Link onClick={() => onMenuOpenChange(false)} aria-current={activeSection === 'interviews' ? 'page' : undefined} className={`flex items-center gap-sm rounded-lg px-md py-sm transition-all active:scale-[0.98] ${activeSection === 'interviews' ? 'bg-[#29345d] text-white' : 'font-medium text-slate-300 hover:bg-white/5'}`} href="/?view=interviews">
            <span aria-hidden="true">▦</span><span className="text-label-md">{copy.interviews}</span>
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{interviewCount}</span>
          </Link>
          <Link onClick={() => onMenuOpenChange(false)} aria-current={activeSection === 'offers' ? 'page' : undefined} className={`flex items-center gap-sm rounded-lg px-md py-sm transition-all active:scale-[0.98] ${activeSection === 'offers' ? 'bg-[#29345d] text-white' : 'font-medium text-slate-300 hover:bg-white/5'}`} href="/?status=offered">
            <span aria-hidden="true">▤</span><span className="text-label-md">{copy.offers}</span>
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{offerCount}</span>
          </Link>
          <div className="mt-auto">
            <Link onClick={() => onMenuOpenChange(false)} className="flex items-center gap-sm rounded-lg px-md py-sm font-medium text-slate-300 transition-all hover:bg-white/5 active:scale-[0.98]" href="/account/profile">
              <span aria-hidden="true">⚙</span><span className="text-label-md">{copy.settings}</span>
            </Link>
          </div>
        </nav>

        <div className="mt-md p-sm">
          <button type="button" onClick={openCandidateModal} className="flex w-full items-center justify-center gap-sm rounded-lg bg-[#4b43ef] py-2.5 text-sm font-bold text-white transition-all hover:bg-[#3f37d8] active:scale-[0.98]">
            <span aria-hidden="true">＋</span>{copy.newCandidate}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-surface text-on-surface md:flex-row">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-48 flex-col gap-sm border-r border-[#202a43] bg-[#10182e] p-3 md:flex">
        {renderSidebar()}
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label={copy.closeMenu} className="absolute inset-0 bg-black/40" onClick={() => onMenuOpenChange(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-56 flex-col gap-sm border-r border-[#202a43] bg-[#10182e] p-3">
            {renderSidebar()}
          </aside>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:ml-48">
        <header className="sticky top-0 z-10 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 lg:px-8">
          <div className="flex h-full min-w-0 items-center gap-2 md:gap-xl">
            <button aria-label={copy.mobileMenu} className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-white text-on-surface md:hidden" onClick={() => onMenuOpenChange(true)}>≡</button>
            <span className="text-sm font-bold text-primary md:hidden">TrackFlow Tech</span>
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8zm12-4a4 4 0 01-3 3.87" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                </svg>
              </span>
              <span className="truncate text-sm font-semibold text-slate-800">{copy.candidates}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-md">
            <button type="button" onClick={onToggleLocale} className="h-9 min-w-11 rounded-full border border-outline-variant bg-white px-3 text-label-md font-semibold text-primary">
              {copy.languageButton}<span aria-hidden="true" className="ml-1 text-[10px] text-slate-400">⌄</span>
            </button>
            <div className="hidden items-center gap-xs rounded-full bg-surface-container-low px-sm py-1.5 min-[900px]:flex">
              <select aria-label={copy.allLocations} value={location} onChange={(event) => onLocationChange(event.target.value as LocationHub)} className="cursor-pointer border-none bg-transparent pr-8 text-label-md focus:ring-0">
                <option value="Todas">{copy.allLocations}</option>
                <option value="Zaragoza">Zaragoza</option>
                <option value="Los Ángeles">Los Ángeles</option>
              </select>
            </div>
            <Link href="/account/profile" aria-label="Abrir perfil" title="Abrir perfil" className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary-container">
              <img alt="" className="h-full w-full object-cover" width={40} height={40} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWGZMtT76XMBgwRklhh9S68wuNAYfm3XGDQnxZOe4y5pN7mfjVbf4sJSViUTiuJl_TAreFkd3tYl2OtOd07nYlffzC9hnVA_Kxhp0K66p-25XjVeYUHHvhJkJlkCsGp6suRzYNvYJA1_VoPn-JWN120vgmoBnkWkWB7HB6yOfjQt3k6MZ15SBRK4HRicaa10qZZAf4d1Q8mihGqJPPZzB5-hy3A2JyFLHfxcjw1tvX1q71_qW7Iyd23-VBQT1naG2EXjrpNyZvkwM" />
            </Link>
            <div className="hidden min-w-0 max-w-36 xl:block">
              <p className="truncate text-xs font-semibold text-slate-800">{user?.profile?.name || user?.email || 'Usuario'}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.role === 'admin' ? 'Administración' : user?.role === 'manager' ? 'Manager' : 'Equipo'}</p>
            </div>
            <button type="button" onClick={onLogout} className="h-9 rounded-full border border-outline-variant bg-white px-3 text-label-md font-semibold text-red-600 transition-colors hover:bg-red-50">Cerrar sesión</button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 overflow-x-hidden px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}