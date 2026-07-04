'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import { trackerApi } from '@/services/api';
import { useLocation } from '@/src/context/LocationContext';
import type { LocationHub } from '@/src/context/LocationContext';
import type { CandidateInput, CandidateRecord, CandidateStage, CandidateStatus } from '@/src/types/tracker';

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
    reviewing: 'En revisión',
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
    technical: 'Técnica',
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
    appSubtitle: 'Talent Pipeline',
    dashboard: 'Dashboard',
    candidates: 'Candidatos',
    interviews: 'Entrevistas',
    offers: 'Ofertas',
    settings: 'Configuración',
    postJob: 'Publicar vacante',
    pipeline: 'Pipeline',
    analytics: 'Analítica',
    positions: 'Posiciones',
    sourcing: 'Sourcing',
    searchPlaceholder: 'Buscar por nombre o email...',
    statusLabel: 'Estado:',
    allStatuses: 'Todos los estados',
    stageLabel: 'Etapa:',
    allStages: 'Todas las etapas',
    newCandidate: '+ Nuevo candidato',
    loadError: 'Error al cargar candidaturas',
    tableName: 'Nombre',
    tablePosition: 'Puesto',
    tableStatus: 'Estado',
    tableStage: 'Etapa',
    tableActions: 'Acciones',
    loading: 'Cargando pipeline de TrackFlow...',
    noResults: 'No hay candidatos que coincidan con los filtros actuales.',
    viewDetails: 'Ver detalle',
    showing: 'Mostrando',
    of: 'de',
    candidatesTotal: 'candidatos',
    page: 'Página',
    activePositions: 'Posiciones activas',
    pendingInterviews: 'Entrevistas pendientes',
    offerAcceptance: 'Aceptación de ofertas',
    fromLastMonth: '+2 vs mes anterior',
    scheduledWeek: 'Programadas esta semana',
    aboveGoal: 'Por encima del objetivo',
    fallbackOps: 'Operario de Almacén - Los Ángeles Hub',
    fallbackTech: 'Fullstack Developer - TrackFlow Tech (Zaragoza)',
    fallbackReverse: 'Agente de Logística Inversa',
    mobileMenu: 'Menú',
    closeMenu: 'Cerrar menú',
    languageButton: 'EN',
  },
  en: {
    appSubtitle: 'Talent Pipeline',
    dashboard: 'Dashboard',
    candidates: 'Candidates',
    interviews: 'Interviews',
    offers: 'Offers',
    settings: 'Settings',
    postJob: 'Post Job',
    pipeline: 'Pipeline',
    analytics: 'Analytics',
    positions: 'Positions',
    sourcing: 'Sourcing',
    searchPlaceholder: 'Search by name or email...',
    statusLabel: 'Status:',
    allStatuses: 'All statuses',
    stageLabel: 'Stage:',
    allStages: 'All stages',
    newCandidate: '+ New Candidate',
    loadError: 'Error loading candidates',
    tableName: 'Candidate Name',
    tablePosition: 'Position',
    tableStatus: 'Status',
    tableStage: 'Stage',
    tableActions: 'Actions',
    loading: 'Loading TrackFlow pipeline...',
    noResults: 'No candidates match your current filters.',
    viewDetails: 'View Details',
    showing: 'Showing',
    of: 'of',
    candidatesTotal: 'candidates',
    page: 'Page',
    activePositions: 'Active Positions',
    pendingInterviews: 'Pending Interviews',
    offerAcceptance: 'Offer Acceptance',
    fromLastMonth: '+2 from last month',
    scheduledWeek: 'Scheduled this week',
    aboveGoal: 'Above target goal',
    fallbackOps: 'Warehouse Operator - Los Angeles Hub',
    fallbackTech: 'Fullstack Developer - TrackFlow Tech (Zaragoza)',
    fallbackReverse: 'Reverse Logistics Agent',
    mobileMenu: 'Menu',
    closeMenu: 'Close menu',
    languageButton: 'ES',
  },
} as const;

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusChipClass(status: CandidateStatus): string {
  switch (status) {
    case 'reviewing':
      return 'bg-orange-50 text-orange-700 border border-orange-100';
    case 'interviewed':
      return 'bg-green-50 text-green-700 border border-green-100';
    case 'offered':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
    case 'accepted':
      return 'bg-teal-50 text-teal-700 border border-teal-100';
    case 'rejected':
      return 'bg-red-50 text-red-700 border border-red-100';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-100';
  }
}

function getStageChipClass(stage: CandidateStage): string {
  switch (stage) {
    case 'technical':
      return 'bg-primary-container/10 text-primary-container border border-primary-container/20';
    case 'final':
      return 'bg-teal-50 text-teal-700 border border-teal-100';
    case 'manager':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
    case 'cultural':
      return 'bg-violet-50 text-violet-700 border border-violet-100';
    default:
      return 'bg-surface-container text-on-secondary-container border border-outline-variant';
  }
}

type CandidateWithLocation = CandidateRecord & {
  city?: string;
  hub?: string;
};

const CANDIDATE_CITY_MAP_KEY = 'tracker:candidate-city-map';

function filterByLocation(
  records: CandidateRecord[],
  location: LocationHub,
): CandidateRecord[] {
  if (location === 'Todas') {
    return records;
  }

  return records.filter((candidate) => {
    const record = candidate as CandidateWithLocation;
    const cityText = (record.city ?? record.hub ?? '').toLowerCase();
    const positionText = candidate.position.toLowerCase();
    const phoneText = (candidate.phone ?? '').toLowerCase();

    if (location === 'Zaragoza') {
      return (
        cityText.includes('zaragoza') ||
        positionText.includes('zaragoza') ||
        phoneText.startsWith('+34')
      );
    }

    return (
      cityText.includes('los ángeles') ||
      cityText.includes('los angeles') ||
      positionText.includes('los ángeles') ||
      positionText.includes('los angeles') ||
      phoneText.startsWith('+1')
    );
  });
}

function filterByQueryParams(
  records: CandidateRecord[],
  params: URLSearchParams,
): CandidateRecord[] {
  const status = params.get('status');
  const stage = params.get('stage');

  return records.filter((candidate) => {
    const statusMatch = status ? candidate.status === status : true;
    const stageMatch = stage ? candidate.stage === stage : true;
    return statusMatch && stageMatch;
  });
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { location, setLocation } = useLocation();

  const [locale, setLocale] = useState<Locale>('es');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [candidateCityMap, setCandidateCityMap] = useState<Record<string, LocationHub>>({});
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    position: '',
    linkedin_url: '',
    cv_url: '',
    experience_years: '',
  });

  const t = dictionary[locale];

  function getStatusOptionLabel(status: CandidateStatus): string {
    return statusLabels[locale][status];
  }

  function getStageOptionLabel(stage: CandidateStage): string {
    return stageLabels[locale][stage];
  }

  function getStatusDisplayLabel(status: CandidateStatus): string {
    return statusLabels[locale][status] ?? toLabel(status);
  }

  function getStageDisplayLabel(stage: CandidateStage): string {
    return stageLabels[locale][stage] ?? toLabel(stage);
  }

  const searchParamsKey = searchParams.toString();

  const statusFromUrl = searchParams.get('status') ?? '';
  const stageFromUrl = searchParams.get('stage') ?? '';

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CANDIDATE_CITY_MAP_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as Record<string, string>;
      const normalized: Record<string, LocationHub> = {};

      Object.entries(parsed).forEach(([id, city]) => {
        if (city === 'Zaragoza' || city === 'Los Ángeles') {
          normalized[id] = city;
        }
      });

      setCandidateCityMap(normalized);
    } catch {
      setCandidateCityMap({});
    }
  }, []);

  function saveCandidateCityMap(nextMap: Record<string, LocationHub>) {
    setCandidateCityMap(nextMap);
    window.localStorage.setItem(CANDIDATE_CITY_MAP_KEY, JSON.stringify(nextMap));
  }

  function withMappedCity(records: CandidateRecord[]): CandidateRecord[] {
    return records.map((record) => {
      const mappedCity = candidateCityMap[record.id];
      if (!mappedCity) return record;

      return {
        ...record,
        city: mappedCity,
      } as CandidateRecord;
    });
  }

  useEffect(() => {
    let active = true;

    async function fetchCandidates() {
      setLoading(true);
      setError(null);

      try {
        const data = await trackerApi.getCandidates();
        if (!active) return;

        const withLocation = withMappedCity(data);
        const locationFiltered = filterByLocation(withLocation, location);
        const queryFiltered = filterByQueryParams(
          locationFiltered,
          new URLSearchParams(searchParamsKey),
        );

        setCandidates(queryFiltered);
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el pipeline.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchCandidates();

    return () => {
      active = false;
    };
  }, [location, searchParamsKey, candidateCityMap]);

  function setQueryParam(key: 'status' | 'stage', value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    router.replace(query ? pathname + '?' + query : pathname);
  }

  const visibleCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const name = candidate.full_name;
      const email = candidate.email;
      const statusMatch = statusFromUrl ? candidate.status === statusFromUrl : true;
      const stageMatch = stageFromUrl ? candidate.stage === stageFromUrl : true;
      const searchMatch = term
        ? name.toLowerCase().includes(term) || email.toLowerCase().includes(term)
        : true;

      return statusMatch && stageMatch && searchMatch;
    });
  }, [candidates, searchTerm, statusFromUrl, stageFromUrl]);

  function toggleLocale() {
    setLocale((prev) => (prev === 'es' ? 'en' : 'es'));
  }

  function getTrackFlowFallback(index: number): string {
    const roles = [t.fallbackOps, t.fallbackTech, t.fallbackReverse];
    return roles[index % roles.length];
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const requiredFields = [
      formData.full_name,
      formData.email,
      formData.phone,
      formData.position,
      formData.experience_years,
    ];

    if (requiredFields.some((value) => !value.trim())) {
      setSubmitError('Completa todos los campos requeridos antes de continuar.');
      return;
    }

    const experienceYears = Number(formData.experience_years);
    if (!Number.isFinite(experienceYears) || experienceYears < 0) {
      setSubmitError('Los años de experiencia deben ser un número válido igual o mayor a 0.');
      return;
    }

    const cvUrl = formData.cv_url.trim();

    const selectedCity = location === 'Todas' ? 'Zaragoza' : location;

    const payload: CandidateInput & { city: 'Zaragoza' | 'Los Ángeles' } = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      position: formData.position.trim(),
      linkedin_url: formData.linkedin_url.trim() || null,
      cv_url: cvUrl || '',
      experience_years: Number(experienceYears),
      status: 'pending',
      stage: 'screening',
      city: selectedCity,
    };

    setIsSubmitting(true);

    try {
      const createdCandidate = await trackerApi.createCandidate(payload);

      const nextCityMap: Record<string, LocationHub> = {
        ...candidateCityMap,
        [createdCandidate.id]: selectedCity,
      };
      saveCandidateCityMap(nextCityMap);

      const data = await trackerApi.getCandidates();
      const withLocation = data.map((record) => {
        const mappedCity = nextCityMap[record.id];
        if (!mappedCity) return record;

        return {
          ...record,
          city: mappedCity,
        } as CandidateRecord;
      });
      const locationFiltered = filterByLocation(withLocation, location);
      const queryFiltered = filterByQueryParams(
        locationFiltered,
        new URLSearchParams(searchParamsKey),
      );

      setCandidates(queryFiltered);
      setSubmitSuccess('Candidatura creada correctamente.');
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        position: '',
        linkedin_url: '',
        cv_url: '',
        experience_years: '',
      });

      window.setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
      }, 900);
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : 'No se pudo crear la candidatura.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderSidebar() {
    return (
      <>
        <div className="flex items-center gap-sm px-sm py-md">
          <div className="w-8 h-8 flex items-center justify-center bg-primary rounded-lg">
            <img
              alt="TrackFlow Tech Logo"
              className="w-6 h-6 object-contain brightness-0 invert"
              src="https://lh3.googleusercontent.com/aida/AP1WRLuQnKTznPD7M2Ge0UAHUGS2bnE2YI3SsTXWqJ5e-op9_yLyrep3pKgqdJ0XCOI5ikEGfGspa6tqd-yp_aRubzuFbgjP4CAbfnTbJdhO82SFjvyy6ivaIy-hzNvlb7fIsumromyOd36CoBKHK2drazZZuDcySwwlBIWSo-w1wHg7EXfi2UeJeGn1yd18vWkzIlds8DTgP5zKB7DUgTuzdIdGCjuD4qbhwqGWbNB1SXDuMCOb-40aQTSGlmA"
            />
          </div>
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-on-surface leading-tight">TrackFlow Tech</h1>
            <p className="text-label-md font-label-md text-on-surface-variant">{t.appSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 mt-md flex flex-col gap-xs">
          <a className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-high transition-all active:scale-[0.98] text-on-surface-variant font-medium" href="#">
            <span className="text-label-md font-label-md">{t.dashboard}</span>
          </a>
          <a className="flex items-center gap-sm px-md py-sm bg-primary-container text-on-primary-container rounded-xl transition-all active:scale-[0.98]" href="#">
            <span className="text-label-md font-label-md">{t.candidates}</span>
          </a>
          <a className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-high transition-all active:scale-[0.98] text-on-surface-variant font-medium" href="#">
            <span className="text-label-md font-label-md">{t.interviews}</span>
          </a>
          <a className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-high transition-all active:scale-[0.98] text-on-surface-variant font-medium" href="#">
            <span className="text-label-md font-label-md">{t.offers}</span>
          </a>
          <div className="mt-auto">
            <a className="flex items-center gap-sm px-md py-sm hover:bg-surface-container-high transition-all active:scale-[0.98] text-on-surface-variant font-medium" href="#">
              <span className="text-label-md font-label-md">{t.settings}</span>
            </a>
          </div>
        </nav>

        <div className="p-sm mt-md">
          <button className="w-full bg-primary-container text-on-primary-container py-3 rounded-xl font-bold flex items-center justify-center gap-sm hover:opacity-90 active:scale-95 transition-all">
            {t.postJob}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full max-w-full overflow-x-hidden bg-surface text-on-surface">
      <aside className="hidden md:flex flex-col fixed md:w-64 h-screen z-30 left-0 top-0 p-md gap-sm bg-surface-container-low border-r border-outline-variant">
        {renderSidebar()}
      </aside>

      {isMenuOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            aria-label={t.closeMenu}
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 p-md gap-sm bg-surface-container-low border-r border-outline-variant">
            {renderSidebar()}
          </aside>
        </div>
      ) : null}

      <main className="flex-1 w-full max-w-full min-w-0 md:pl-64 flex flex-col p-4 md:p-8 overflow-x-hidden">
        <header className="flex justify-between items-center w-full max-w-full min-w-0 h-16 px-3 md:px-4 bg-surface-container-lowest border border-outline-variant rounded-xl sticky top-4 z-10">
          <div className="flex items-center gap-2 md:gap-xl h-full min-w-0">
            <button
              aria-label={t.mobileMenu}
              className="md:hidden h-9 w-9 rounded-lg border border-outline-variant bg-white text-on-surface flex items-center justify-center"
              onClick={() => setIsMenuOpen(true)}
            >
              ≡
            </button>
            <div className="flex items-center gap-md min-w-0">
              <img
                alt="TrackFlow Icon"
                className="w-6 h-6"
                src="https://lh3.googleusercontent.com/aida/AP1WRLuQnKTznPD7M2Ge0UAHUGS2bnE2YI3SsTXWqJ5e-op9_yLyrep3pKgqdJ0XCOI5ikEGfGspa6tqd-yp_aRubzuFbgjP4CAbfnTbJdhO82SFjvyy6ivaIy-hzNvlb7fIsumromyOd36CoBKHK2drazZZuDcySwwlBIWSo-w1wHg7EXfi2UeJeGn1yd18vWkzIlds8DTgP5zKB7DUgTuzdIdGCjuD4qbhwqGWbNB1SXDuMCOb-40aQTSGlmA"
              />
              <span className="text-title-lg font-title-lg font-black text-primary truncate">TrackFlow Tech</span>
            </div>
            <nav className="hidden lg:flex items-center gap-lg h-full">
              <a className="text-on-surface-variant font-medium hover:text-primary transition-colors h-full flex items-center px-sm" href="#">{t.pipeline}</a>
              <a className="text-on-surface-variant font-medium hover:text-primary transition-colors h-full flex items-center px-sm" href="#">{t.analytics}</a>
              <a className="text-primary border-b-2 border-primary pb-1 font-bold h-full flex items-center px-sm mt-[2px]" href="#">{t.positions}</a>
              <a className="text-on-surface-variant font-medium hover:text-primary transition-colors h-full flex items-center px-sm" href="#">{t.sourcing}</a>
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-md shrink-0">
            <button
              className="h-9 min-w-11 rounded-full border border-outline-variant bg-white px-3 text-label-md font-semibold text-primary"
              onClick={toggleLocale}
            >
              {t.languageButton}
            </button>
            <div className="hidden sm:flex items-center gap-xs px-sm py-1.5 bg-surface-container-low rounded-full cursor-pointer hover:bg-surface-container-high transition-colors">
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value as LocationHub)}
                className="bg-transparent border-none text-label-md font-label-md focus:ring-0 cursor-pointer pr-8"
              >
                <option value="Todas">Todas</option>
                <option value="Zaragoza">Zaragoza</option>
                <option value="Los Ángeles">Los Ángeles</option>
              </select>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container cursor-pointer active:scale-95 transition-transform">
              <img
                alt="User profile photo"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWGZMtT76XMBgwRklhh9S68wuNAYfm3XGDQnxZOe4y5pN7mfjVbf4sJSViUTiuJl_TAreFkd3tYl2OtOd07nYlffzC9hnVA_Kxhp0K66p-25XjVeYUHHvhJkJlkCsGp6suRzYNvYJA1_VoPn-JWN120vgmoBnkWkWB7HB6yOfjQt3k6MZ15SBRK4HRicaa10qZZAf4d1Q8mihGqJPPZzB5-hy3A2JyFLHfxcjw1tvX1q71_qW7Iyd23-VBQT1naG2EXjrpNyZvkwM"
              />
            </div>
          </div>
        </header>

        <div className="w-full max-w-full min-w-0 py-lg md:py-xl overflow-x-hidden">
          <div className="w-full flex flex-col gap-4 p-4 bg-white border border-gray-100 rounded-xl mb-xl">
            <div className="relative flex-1 w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-gray-900"
                placeholder="Buscar por nombre o email..."
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="w-full flex flex-col gap-4">
              <div className="flex items-center gap-2 w-full">
                <span className="text-[11px] font-bold text-gray-400 tracking-wider whitespace-nowrap">ESTADO:</span>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-600"
                  value={statusFromUrl}
                  onChange={(event) => setQueryParam('status', event.target.value)}
                >
                  <option value="">{t.allStatuses}</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getStatusOptionLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full">
                <span className="text-[11px] font-bold text-gray-400 tracking-wider whitespace-nowrap">ETAPA:</span>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:border-blue-600"
                  value={stageFromUrl}
                  onChange={(event) => setQueryParam('stage', event.target.value)}
                >
                  <option value="">{t.allStages}</option>
                  {STAGE_OPTIONS.map((stage) => (
                    <option key={stage} value={stage}>
                      {getStageOptionLabel(stage)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="w-full bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              onClick={() => {
                setSubmitError(null);
                setSubmitSuccess(null);
                setIsModalOpen(true);
              }}
              type="button"
            >
              + Nuevo candidato
            </button>
          </div>

          {error ? (
            <FeedbackAlert message={t.loadError + ': ' + error} variant="error" className="mb-lg p-md" />
          ) : null}

          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm w-full max-w-full min-w-0">
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse hidden md:table">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-lg py-4 text-label-sm font-label-sm text-outline uppercase tracking-wider">{t.tableName}</th>
                    <th className="px-lg py-4 text-label-sm font-label-sm text-outline uppercase tracking-wider">{t.tablePosition}</th>
                    <th className="px-lg py-4 text-label-sm font-label-sm text-outline uppercase tracking-wider">{t.tableStatus}</th>
                    <th className="px-lg py-4 text-label-sm font-label-sm text-outline uppercase tracking-wider">{t.tableStage}</th>
                    <th className="px-lg py-4 text-label-sm font-label-sm text-outline uppercase tracking-wider text-right">{t.tableActions}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-outline-variant">
                  {loading ? (
                    <tr>
                      <td className="px-lg py-10" colSpan={5}>
                        <div className="flex items-center justify-center gap-sm text-on-surface-variant">
                          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-container-high border-t-primary" />
                          <span className="text-body-md">{t.loading}</span>
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {!loading && visibleCandidates.length === 0 ? (
                    <tr>
                      <td className="px-lg py-10 text-center text-body-md text-on-surface-variant" colSpan={5}>
                        <div className="space-y-1">
                          <p>{t.noResults}</p>
                          <p className="text-label-sm text-outline">{t.fallbackOps}</p>
                          <p className="text-label-sm text-outline">{t.fallbackTech}</p>
                          <p className="text-label-sm text-outline">{t.fallbackReverse}</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {!loading
                    ? visibleCandidates.map((candidate) => {
                        const name = candidate.full_name;
                        const email = candidate.email;

                        return (
                          <tr key={candidate.id} className="hover:bg-background transition-colors group cursor-pointer">
                            <td className="px-lg py-4">
                              <div className="flex items-center gap-md">
                                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden">
                                  <img
                                    className="w-full h-full object-cover"
                                    alt={name}
                                    src={'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(name)}
                                  />
                                </div>
                                <div>
                                  <p className="text-body-md font-bold text-on-surface">{name}</p>
                                  <p className="text-label-sm font-label-sm text-on-surface-variant">{email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-lg py-4">
                              <p className="text-body-md text-on-surface-variant font-medium">{candidate.position}</p>
                              <p className="text-label-sm font-label-sm text-outline">{getTrackFlowFallback(Number(candidate.id.replace(/\D/g, '').slice(-2)) || 0)}</p>
                            </td>
                            <td className="px-lg py-4">
                              <span className={'inline-flex items-center px-3 py-1 rounded-full text-label-md font-label-md ' + getStatusChipClass(candidate.status)}>
                                {getStatusDisplayLabel(candidate.status)}
                              </span>
                            </td>
                            <td className="px-lg py-4">
                              <span className={'inline-flex items-center px-3 py-1 rounded-full text-label-md font-label-md ' + getStageChipClass(candidate.stage)}>
                                {getStageDisplayLabel(candidate.stage)}
                              </span>
                            </td>
                            <td className="px-lg py-4 text-right">
                              <div className="flex items-center justify-end gap-md">
                                <Link className="text-primary font-bold text-label-md hover:underline" href={'/candidates/' + candidate.id}>
                                  {t.viewDetails}
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden space-y-2 p-2">
              {loading ? (
                <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-container-high border-t-primary" />
                    <span className="text-body-md">{t.loading}</span>
                  </div>
                </div>
              ) : null}

              {!loading && visibleCandidates.length === 0 ? (
                <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm">
                  <p className="text-body-md text-on-surface-variant">{t.noResults}</p>
                  <ul className="mt-2 text-label-sm text-outline space-y-1">
                    <li>{t.fallbackOps}</li>
                    <li>{t.fallbackTech}</li>
                    <li>{t.fallbackReverse}</li>
                  </ul>
                </div>
              ) : null}

              {!loading
                ? visibleCandidates.map((candidate) => {
                    const name = candidate.full_name;
                    const email = candidate.email;

                    return (
                      <div key={candidate.id} className="w-full max-w-full block p-3 border border-gray-100 rounded-xl bg-white shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              alt={name}
                              src={'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(name)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-body-md font-bold text-on-surface truncate">{name}</p>
                            <p className="text-label-sm text-on-surface-variant truncate">{email}</p>
                            <p className="text-label-sm text-outline mt-1 truncate">{candidate.position || t.fallbackOps}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={'inline-flex items-center px-3 py-1 rounded-full text-label-md font-label-md ' + getStatusChipClass(candidate.status)}>
                            {getStatusDisplayLabel(candidate.status)}
                          </span>
                          <span className={'inline-flex items-center px-3 py-1 rounded-full text-label-md font-label-md ' + getStageChipClass(candidate.stage)}>
                            {getStageDisplayLabel(candidate.stage)}
                          </span>
                        </div>

                        <div className="mt-3">
                          <Link className="text-primary font-bold text-label-md hover:underline" href={'/candidates/' + candidate.id}>
                            {t.viewDetails}
                          </Link>
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>

            <div className="bg-surface-container-low px-lg py-3 flex items-center justify-between border-t border-outline-variant">
              <p className="text-label-sm font-label-sm text-on-surface-variant">{t.showing} {visibleCandidates.length} {t.of} {candidates.length} {t.candidatesTotal}</p>
              <div className="flex items-center gap-sm">
                <button className="p-1 rounded border border-outline-variant disabled:opacity-50" disabled>
                  {'<'}
                </button>
                <span className="text-label-sm font-label-sm px-2">{t.page} 1 {t.of} 1</span>
                <button className="p-1 rounded border border-outline-variant hover:bg-white transition-colors" disabled>
                  {'>'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-xl">
            <div className="bg-white border border-outline-variant p-lg rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider mb-1">{t.activePositions}</p>
                <h3 className="text-headline-md font-bold text-primary">12</h3>
                <p className="text-label-sm font-label-sm text-green-600 mt-1">{t.fromLastMonth}</p>
              </div>
            </div>

            <div className="bg-white border border-outline-variant p-lg rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider mb-1">{t.pendingInterviews}</p>
                <h3 className="text-headline-md font-bold text-primary">28</h3>
                <p className="text-label-sm font-label-sm text-on-surface-variant mt-1">{t.scheduledWeek}</p>
              </div>
            </div>

            <div className="bg-white border border-outline-variant p-lg rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider mb-1">{t.offerAcceptance}</p>
                <h3 className="text-headline-md font-bold text-primary">94%</h3>
                <p className="text-label-sm font-label-sm text-green-600 mt-1">{t.aboveGoal}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 p-4 sm:p-6">
          <button
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (isSubmitting) return;
              setIsModalOpen(false);
              setSubmitError(null);
              setSubmitSuccess(null);
            }}
            type="button"
          />

          <div className="relative mx-auto mt-8 sm:mt-12 w-[min(92vw,42rem)] max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Registrar nueva candidatura</h2>
              <button
                aria-label="Cerrar modal"
                className="h-9 w-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  if (isSubmitting) return;
                  setIsModalOpen(false);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-64px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {submitError ? (
                <FeedbackAlert message={submitError} variant="error" className="mb-4 px-3 py-2" />
              ) : null}

              {submitSuccess ? (
                <FeedbackAlert message={submitSuccess} variant="success" className="mb-4 px-3 py-2" />
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Nombre completo *"
                    value={formData.full_name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, full_name: event.target.value }))}
                    type="text"
                  />
                  <input
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    type="email"
                  />
                  <input
                    className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Teléfono *"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    type="tel"
                  />
                  <input
                    className="w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Años de experiencia *"
                    value={formData.experience_years}
                    onChange={(event) => setFormData((prev) => ({ ...prev, experience_years: event.target.value }))}
                    type="number"
                    min={0}
                  />
                  <input
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Puesto *"
                    value={formData.position}
                    onChange={(event) => setFormData((prev) => ({ ...prev, position: event.target.value }))}
                    type="text"
                  />
                  <input
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="LinkedIn"
                    value={formData.linkedin_url}
                    onChange={(event) => setFormData((prev) => ({ ...prev, linkedin_url: event.target.value }))}
                    type="url"
                  />
                  <input
                    className="sm:col-span-2 w-full min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-600"
                    placeholder="Enlace al CV"
                    value={formData.cv_url}
                    onChange={(event) => setFormData((prev) => ({ ...prev, cv_url: event.target.value }))}
                    type="url"
                  />
                </div>

                <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      if (isSubmitting) return;
                      setIsModalOpen(false);
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="w-full sm:w-auto bg-[#1e3a8a] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-900 disabled:opacity-70"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? 'Guardando...' : 'Registrar candidatura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
