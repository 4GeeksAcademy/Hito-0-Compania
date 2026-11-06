'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { trackerApi } from '@/services/api';
import type { LocationHub } from '@/src/context/LocationContext';
import type { CandidateRecord } from '@/src/types/tracker';

type CandidateWithLocation = CandidateRecord & {
  city?: string;
  hub?: string;
};

const CANDIDATE_CITY_MAP_KEY = 'tracker:candidate-city-map';

function readCandidateCityMap(): Record<string, LocationHub> {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.localStorage.getItem(CANDIDATE_CITY_MAP_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, city]) => city === 'Zaragoza' || city === 'Los Ángeles'),
    ) as Record<string, LocationHub>;
  } catch {
    return {};
  }
}

function filterByLocation(records: CandidateRecord[], location: LocationHub): CandidateRecord[] {
  if (location === 'Todas') return records;

  return records.filter((candidate) => {
    const record = candidate as CandidateWithLocation;
    const cityText = (record.city ?? record.hub ?? '').toLowerCase();
    const positionText = candidate.position.toLowerCase();
    const phoneText = (candidate.phone ?? '').toLowerCase();

    if (location === 'Zaragoza') {
      return cityText.includes('zaragoza') || positionText.includes('zaragoza') || phoneText.startsWith('+34');
    }

    return cityText.includes('los ángeles')
      || cityText.includes('los angeles')
      || positionText.includes('los ángeles')
      || positionText.includes('los angeles')
      || phoneText.startsWith('+1');
  });
}

export function isInterviewCandidate(candidate: CandidateRecord): boolean {
  return candidate.status === 'interviewed'
    || ['cultural', 'manager', 'final'].includes(candidate.stage);
}

function filterByQueryParams(records: CandidateRecord[], params: URLSearchParams): CandidateRecord[] {
  const status = params.get('status');
  const stage = params.get('stage');
  const view = params.get('view');

  return records.filter((candidate) => {
    const interviewMatch = view !== 'interviews' || isInterviewCandidate(candidate);

    return (!status || candidate.status === status)
      && (!stage || candidate.stage === stage)
      && interviewMatch;
  });
}

interface UseCandidatePipelineOptions {
  location: LocationHub;
  searchParamsKey: string;
  searchTerm: string;
  activeOnly: boolean;
  withoutNotes: boolean;
}

export function useCandidatePipeline({
  location,
  searchParamsKey,
  searchTerm,
  activeOnly,
  withoutNotes,
}: UseCandidatePipelineOptions) {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [candidateCityMap, setCandidateCityMap] = useState<Record<string, LocationHub>>(readCandidateCityMap);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async (mappedCities: Record<string, LocationHub>) => {
    const records = await trackerApi.getCandidates();
    const withLocation = records.map((record) => {
      const city = mappedCities[record.id];
      return city ? { ...record, city } as CandidateRecord : record;
    });

    return filterByLocation(withLocation, location);
  }, [location]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setCandidates(await fetchCandidates(candidateCityMap));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el pipeline.');
    } finally {
      setLoading(false);
    }
  }, [candidateCityMap, fetchCandidates]);

  useEffect(() => {
    let active = true;

    fetchCandidates(candidateCityMap)
      .then((records) => {
        if (!active) return;
        setCandidates(records);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar el pipeline.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [candidateCityMap, fetchCandidates]);

  const refreshCandidates = useCallback(async (mappedCities = candidateCityMap) => {
    const refreshedCandidates = await fetchCandidates(mappedCities);
    setCandidates(refreshedCandidates);
    return refreshedCandidates;
  }, [candidateCityMap, fetchCandidates]);

  function saveCandidateCityMap(nextMap: Record<string, LocationHub>) {
    setCandidateCityMap(nextMap);
    window.localStorage.setItem(CANDIDATE_CITY_MAP_KEY, JSON.stringify(nextMap));
  }

  const visibleCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return filterByQueryParams(candidates, new URLSearchParams(searchParamsKey)).filter((candidate) => {
      const activeMatch = activeOnly ? !['accepted', 'rejected'].includes(candidate.status) : true;
      const notesMatch = withoutNotes ? candidate.notes_count === 0 : true;
      const searchMatch = term
        ? candidate.full_name.toLowerCase().includes(term)
          || candidate.email.toLowerCase().includes(term)
          || candidate.position.toLowerCase().includes(term)
        : true;

      return activeMatch && notesMatch && searchMatch;
    });
  }, [activeOnly, candidates, searchParamsKey, searchTerm, withoutNotes]);

  return {
    candidates,
    candidateCityMap,
    error,
    loading,
    loadCandidates,
    refreshCandidates,
    saveCandidateCityMap,
    setError,
    visibleCandidates,
  };
}