'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import FeedbackAlert from '@/src/components/FeedbackAlert';
import CandidateModal from '@/src/components/pipeline/CandidateModal';
import CandidateFilters from '@/src/components/pipeline/CandidateFilters';
import CandidateResults from '@/src/components/pipeline/CandidateResults';
import PipelineOverview from '@/src/components/pipeline/PipelineOverview';
import PipelineShell from '@/src/components/pipeline/PipelineShell';
import { isInterviewCandidate, useCandidatePipeline } from '@/src/hooks/useCandidatePipeline';
import { trackerApi } from '@/services/api';
import { useAuth } from '@/src/context/AuthContext';
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

const PAGE_SIZE = 5;

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
    pipeline: 'Pipeline',
    analytics: 'Analítica',
    positions: 'Posiciones',
    sourcing: 'Sourcing',
    searchPlaceholder: 'Buscar por nombre, email, puesto o palabras clave...',
    statusLabel: 'Estado:',
    allStatuses: 'Todos los estados',
    stageLabel: 'Etapa:',
    allStages: 'Todas las etapas',
    newCandidate: 'Nuevo candidato',
    loadError: 'Error al cargar candidaturas',
    tableName: 'Nombre del candidato',
    tablePosition: 'Puesto y asignación',
    tableStatus: 'Estado',
    tableStage: 'Etapa del proceso',
    tableActions: 'Acciones',
    loading: 'Cargando pipeline de TrackFlow...',
    noResults: 'No hay candidatos que coincidan con los filtros actuales.',
    noInterviewCandidates: 'No hay candidatos en etapas de entrevista.',
    noOffers: 'No hay ofertas enviadas.',
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
    mobileMenu: 'Menú',
    closeMenu: 'Cerrar menú',
    languageButton: 'EN',
    pageTitle: 'Gestión de Candidatos',
    pageSubtitle: 'Revisa, filtra y gestiona el flujo de postulaciones activas en todas las unidades.',
    breadcrumb: 'Atracción de Talento',
    candidateBase: 'Base de Candidatos',
    allLocations: 'Todas las sedes',
    totalCandidates: 'Total',
    inProcess: 'En proceso',
    interviewStage: 'En entrevistas',
    hired: 'Contratados',
    activeOnly: 'Solo activos',
    withoutNotes: 'Sin notas',
    resetFilters: 'Restablecer',
    exportCsv: 'Exportar CSV',
  },
  en: {
    appSubtitle: 'Talent Pipeline',
    dashboard: 'Dashboard',
    candidates: 'Candidates',
    interviews: 'Interviews',
    offers: 'Offers',
    settings: 'Settings',
    pipeline: 'Pipeline',
    analytics: 'Analytics',
    positions: 'Positions',
    sourcing: 'Sourcing',
    searchPlaceholder: 'Search by name, email, position, or keyword...',
    statusLabel: 'Status:',
    allStatuses: 'All statuses',
    stageLabel: 'Stage:',
    allStages: 'All stages',
    newCandidate: 'New Candidate',
    loadError: 'Error loading candidates',
    tableName: 'Candidate Name',
    tablePosition: 'Position and Assignment',
    tableStatus: 'Status',
    tableStage: 'Process Stage',
    tableActions: 'Actions',
    loading: 'Loading TrackFlow pipeline...',
    noResults: 'No candidates match your current filters.',
    noInterviewCandidates: 'No candidates are in interview stages.',
    noOffers: 'There are no offers yet.',
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
    mobileMenu: 'Menu',
    closeMenu: 'Close menu',
    languageButton: 'ES',
    pageTitle: 'Candidate Management',
    pageSubtitle: 'Review and manage active applications across all locations.',
    breadcrumb: 'Talent Acquisition',
    candidateBase: 'Candidate Base',
    allLocations: 'All locations',
    totalCandidates: 'Total',
    inProcess: 'In progress',
    interviewStage: 'Interview stage',
    hired: 'Hired',
    activeOnly: 'Active only',
    withoutNotes: 'No notes',
    resetFilters: 'Reset filters',
    exportCsv: 'Export CSV',
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

const candidateAvatarColors = [
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-indigo-50 border-indigo-200 text-indigo-700',
  'bg-sky-50 border-sky-200 text-sky-700',
  'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
  'bg-orange-50 border-orange-200 text-orange-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
];

function getCandidateInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

function getCandidateAvatarClass(name: string): string {
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return candidateAvatarColors[hash % candidateAvatarColors.length];
}

function getCandidateLocation(
  candidate: CandidateRecord,
  mappedCities: Record<string, LocationHub>,
): string | null {
  const record = candidate as CandidateWithLocation;
  return mappedCities[candidate.id] ?? record.city ?? record.hub ?? null;
}

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { location, setLocation } = useLocation();
  const { user, logout } = useAuth();

  const [locale, setLocale] = useState<Locale>('es');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [withoutNotes, setWithoutNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
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
  const viewFromUrl = searchParams.get('view') ?? '';
  const activeSection = viewFromUrl === 'interviews'
    ? 'interviews'
    : statusFromUrl === 'offered'
      ? 'offers'
      : 'candidates';
  const activeViewLabel = activeSection === 'interviews'
    ? t.interviews
    : activeSection === 'offers'
      ? t.offers
      : t.candidateBase;
  const noResultsMessage = activeSection === 'interviews'
    ? t.noInterviewCandidates
    : activeSection === 'offers'
      ? t.noOffers
      : t.noResults;
  const {
    candidates,
    candidateCityMap,
    error,
    loading,
    loadCandidates,
    refreshCandidates,
    saveCandidateCityMap,
    visibleCandidates,
  } = useCandidatePipeline({ location, searchParamsKey, searchTerm, activeOnly, withoutNotes });

  function setQueryParam(key: 'status' | 'stage', value: string) {
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    router.replace(query ? pathname + '?' + query : pathname);
  }

  const pageCount = Math.max(1, Math.ceil(visibleCandidates.length / PAGE_SIZE));
  const displayedPage = Math.min(currentPage, pageCount);
  const pageStart = (displayedPage - 1) * PAGE_SIZE;
  const pageCandidates = useMemo(
    () => visibleCandidates.slice(pageStart, pageStart + PAGE_SIZE),
    [visibleCandidates, pageStart],
  );
  const pageButtons: Array<number | 'ellipsis'> = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : displayedPage <= 3
      ? [1, 2, 3, 'ellipsis', pageCount]
      : displayedPage >= pageCount - 2
        ? [1, 'ellipsis', pageCount - 2, pageCount - 1, pageCount]
        : [1, 'ellipsis', displayedPage - 1, displayedPage, displayedPage + 1, 'ellipsis', pageCount];

  const summaryMetrics = [
    { label: t.totalCandidates, value: candidates.length, color: 'text-on-surface' },
    { label: t.inProcess, value: candidates.filter((candidate) => !['accepted', 'rejected'].includes(candidate.status)).length, color: 'text-primary' },
    { label: t.interviewStage, value: candidates.filter(isInterviewCandidate).length, color: 'text-amber-600' },
    { label: t.hired, value: candidates.filter((candidate) => candidate.status === 'accepted').length, color: 'text-emerald-600' },
  ];

  function resetFilters() {
    setCurrentPage(1);
    setSearchTerm('');
    setActiveOnly(false);
    setWithoutNotes(false);
    setLocation('Todas');
    router.replace(pathname);
  }

  function exportCandidates() {
    const fields = [
      'full_name', 'email', 'phone', 'position', 'status', 'stage', 'experience_years',
    ] as const;
    const csvCell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      fields.map((field) => csvCell(field)).join(','),
      ...visibleCandidates.map((candidate) => fields.map((field) => csvCell(candidate[field])).join(',')),
    ];
    const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `candidatos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleLocale() {
    setLocale((prev) => (prev === 'es' ? 'en' : 'es'));
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

      await refreshCandidates(nextCityMap);
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

  return (
    <>
      <PipelineShell
        copy={t}
        user={user}
        location={location}
        candidateCount={candidates.length}
        interviewCount={summaryMetrics[2].value}
        offerCount={candidates.filter((candidate) => candidate.status === 'offered').length}
        activeSection={activeSection}
        menuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        onLocationChange={(nextLocation) => {
          setCurrentPage(1);
          setLocation(nextLocation);
        }}
        onToggleLocale={toggleLocale}
        onLogout={logout}
        onCreateCandidate={() => {
          setSubmitError(null);
          setSubmitSuccess(null);
          setIsModalOpen(true);
        }}
      >
        <PipelineOverview copy={{ ...t, candidateBase: activeViewLabel }} metrics={summaryMetrics} />
        <CandidateFilters
          copy={t}
          searchTerm={searchTerm}
          status={statusFromUrl}
          stage={stageFromUrl}
          activeOnly={activeOnly}
          withoutNotes={withoutNotes}
          exportDisabled={visibleCandidates.length === 0}
          statusOptions={STATUS_OPTIONS}
          stageOptions={STAGE_OPTIONS}
          getStatusLabel={getStatusOptionLabel}
          getStageLabel={getStageOptionLabel}
          onSearchChange={(value) => { setCurrentPage(1); setSearchTerm(value); }}
          onStatusChange={(value) => setQueryParam('status', value)}
          onStageChange={(value) => setQueryParam('stage', value)}
          onToggleActiveOnly={() => { setCurrentPage(1); setActiveOnly((value) => !value); }}
          onToggleWithoutNotes={() => { setCurrentPage(1); setWithoutNotes((value) => !value); }}
          onReset={resetFilters}
          onExport={exportCandidates}
        />
        {error ? (
          <FeedbackAlert
            message={t.loadError + ': ' + error}
            variant="error"
            className="mb-lg p-md"
            action={{ label: 'Reintentar', onClick: loadCandidates }}
          />
        ) : null}
        <CandidateResults
          copy={{ ...t, noResults: noResultsMessage }}
          locale={locale}
          loading={loading}
          candidates={pageCandidates}
          visibleCount={visibleCandidates.length}
          pageStart={pageStart}
          currentPage={displayedPage}
          pageCount={pageCount}
          pageButtons={pageButtons}
          candidateCityMap={candidateCityMap}
          getStatusClass={getStatusChipClass}
          getStageClass={getStageChipClass}
          getStatusLabel={getStatusDisplayLabel}
          getStageLabel={getStageDisplayLabel}
          getInitials={getCandidateInitials}
          getAvatarClass={getCandidateAvatarClass}
          getLocation={getCandidateLocation}
          onPageChange={setCurrentPage}
        />
      </PipelineShell>
      <CandidateModal
        open={isModalOpen}
        submitting={isSubmitting}
        error={submitError}
        success={submitSuccess}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
          setSubmitError(null);
          setSubmitSuccess(null);
        }}
      />
    </>
  );
}
