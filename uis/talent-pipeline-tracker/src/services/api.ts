import type {
  CandidateInput,
  CandidateRecord,
  CandidateStage,
  CandidateStatus,
  CreateNoteInput,
  Note,
  NotesListResponse,
  RecordsListResponse,
} from '@/src/types/tracker';

import {
  buildAuthHeaders,
  checkUnauthorized,
} from './http-client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'https://playground.4geeks.com/tracker/api/v1';

type ApiErrorPayload = {
  message?: string;
  error?: string;
  detail?: string | Array<{ msg?: string }>;
};

type RawCandidateRecord = Omit<CandidateRecord, 'status' | 'stage'> & {
  status: string;
  stage: string;
};

function normalizeStatus(status: string): CandidateStatus {
  switch (status) {
    case 'pending':
    case 'received':
      return 'pending';
    case 'reviewing':
    case 'in_progress':
      return 'reviewing';
    case 'interviewed':
      return 'interviewed';
    case 'offered':
      return 'offered';
    case 'accepted':
    case 'selected':
    case 'hired':
      return 'accepted';
    case 'rejected':
    case 'discarded':
      return 'rejected';
    default:
      return 'pending';
  }
}

function normalizeStage(stage: string): CandidateStage {
  switch (stage) {
    case 'screening':
    case 'pending':
      return 'screening';
    case 'technical':
    case 'review':
      return 'technical';
    case 'technical_interview':
      return 'manager';
    case 'cultural':
    case 'personal_interview':
      return 'cultural';
    case 'manager':
      return 'manager';
    case 'final':
    case 'offer_presented':
      return 'final';
    default:
      return 'screening';
  }
}

function normalizeCandidate(raw: RawCandidateRecord): CandidateRecord {
  return {
    ...raw,
    status: normalizeStatus(raw.status),
    stage: normalizeStage(raw.stage),
  };
}

async function extractErrorMessage(response: Response): Promise<string> {
  const statusCode = response.status;

  const statusMessages: Record<number, string> = {
    400: 'La solicitud no es válida. Revisá los datos e intentá nuevamente.',
    401: 'Tu sesión expiró. Iniciá sesión de nuevo.',
    403: 'No tenés permiso para realizar esta acción.',
    404: 'No encontramos lo que buscabas.',
    409: 'Ya existe un registro con esos datos.',
    422: 'Algunos datos ingresados no son válidos.',
    429: 'Hiciste demasiadas solicitudes. Esperá unos segundos y volvé a intentar.',
    500: 'Ocurrió un error en el servidor. Si el problema persiste, contactá a soporte.',
    502: 'El servidor está temporalmente fuera de servicio. Intentá de nuevo en unos minutos.',
    503: 'El servicio no está disponible en este momento. Intentá más tarde.',
  };

  const userFriendly = statusMessages[statusCode];
  if (userFriendly) {
    return userFriendly;
  }

  try {
    const data = (await response.json()) as ApiErrorPayload;

    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data.detail)) {
      const detailMessages = data.detail
        .map((item) => item?.msg)
        .filter((msg): msg is string => Boolean(msg));

      if (detailMessages.length > 0) {
        return detailMessages.join(', ');
      }
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    return 'Ocurrió un error inesperado. Intentá de nuevo o contactá a soporte técnico.';
  } catch {
    return 'Error de conexión. Verificá tu conexión a internet e intentá nuevamente.';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      cache: 'no-store',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Fetch lanzó (sin red / DNS / timeout del navegador)
    throw new Error('No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.');
  }

  // 401 → token inválido/expirado: limpiar sesión y redirigir
  if (response.status === 401) {
    checkUnauthorized(response);
    throw new Error('Sesión expirada. Iniciá sesión nuevamente.');
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('El servidor respondió con un formato inesperado. Intentá nuevamente.');
  }
}

export async function getRecords(): Promise<CandidateRecord[]> {
  const limit = 100;
  const firstPage = await request<Omit<RecordsListResponse, 'data'> & { data: RawCandidateRecord[] }>(
    '/records?limit=' + limit + '&page=1',
  );

  let allRecords = [...firstPage.data];
  const totalPages = Math.max(1, Math.ceil(firstPage.total / limit));

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await request<Omit<RecordsListResponse, 'data'> & { data: RawCandidateRecord[] }>(
      '/records?limit=' + limit + '&page=' + page,
    );
    allRecords = allRecords.concat(response.data);
  }

  return allRecords.map(normalizeCandidate);
}

export async function getRecordById(id: string): Promise<CandidateRecord> {
  const response = await request<RawCandidateRecord>('/records/' + id);
  return normalizeCandidate(response);
}

export async function createRecord(
  payload: CandidateInput,
): Promise<CandidateRecord> {
  const response = await request<RawCandidateRecord>('/records', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeCandidate(response);
}

export async function updateRecord(
  id: string,
  payload: CandidateInput,
): Promise<CandidateRecord> {
  const response = await request<RawCandidateRecord>('/records/' + id, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeCandidate(response);
}

export async function patchRecord(
  id: string,
  payload: Partial<Pick<CandidateRecord, 'status' | 'stage'>>,
): Promise<CandidateRecord> {
  if (!payload.status && !payload.stage) {
    throw new Error('At least one field (status or stage) is required');
  }

  const statusToApi: Record<CandidateStatus, string> = {
    pending: 'received',
    reviewing: 'in_progress',
    interviewed: 'in_progress',
    offered: 'selected',
    rejected: 'discarded',
    accepted: 'selected',
  };

  const stageToApi: Record<CandidateStage, string> = {
    screening: 'pending',
    technical: 'review',
    cultural: 'personal_interview',
    manager: 'technical_interview',
    final: 'offer_presented',
  };

  const patchPayload: Record<string, string> = {};
  if (payload.status) {
    patchPayload.status = statusToApi[payload.status];
  }
  if (payload.stage) {
    patchPayload.stage = stageToApi[payload.stage];
  }

  const response = await request<RawCandidateRecord>('/records/' + id, {
    method: 'PATCH',
    body: JSON.stringify(patchPayload),
  });
  return normalizeCandidate(response);
}

export async function updateRecordStatus(
  id: string,
  status: CandidateStatus,
): Promise<CandidateRecord> {
  return patchRecord(id, { status });
}

export async function updateRecordStage(
  id: string,
  stage: CandidateStage,
): Promise<CandidateRecord> {
  return patchRecord(id, { stage });
}

export async function getRecordNotes(recordId: string): Promise<Note[]> {
  const response = await request<NotesListResponse>('/records/' + recordId + '/notes');
  return response.data;
}

export async function createRecordNote(
  recordId: string,
  payload: CreateNoteInput,
): Promise<Note> {
  return request<Note>('/records/' + recordId + '/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteRecordNote(
  recordId: string,
  noteId: string,
): Promise<void> {
  await request<void>('/records/' + recordId + '/notes/' + noteId, {
    method: 'DELETE',
  });
}

export const trackerApi = {
  getCandidates: getRecords,
  getCandidateById: getRecordById,
  createCandidate: createRecord,
  updateCandidate: updateRecord,
  updateCandidateFields: patchRecord,
  patchCandidate: patchRecord,
  updateCandidateStatus: updateRecordStatus,
  updateCandidateStage: updateRecordStage,
  getNotes: getRecordNotes,
  getCandidateNotes: getRecordNotes,
  createNote: async (recordId: string, content: string) => {
    return createRecordNote(recordId, { content });
  },
  createCandidateNote: createRecordNote,
  deleteNote: deleteRecordNote,
  deleteCandidateNote: deleteRecordNote,
};