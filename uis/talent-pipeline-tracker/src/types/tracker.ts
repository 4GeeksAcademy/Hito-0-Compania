export type CandidateStatus =
  | 'pending'
  | 'reviewing'
  | 'interviewed'
  | 'offered'
  | 'rejected'
  | 'accepted';

export type CandidateStage =
  | 'screening'
  | 'technical'
  | 'cultural'
  | 'manager'
  | 'final';

export interface Note {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface CandidateRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string;
  status: CandidateStatus;
  stage: CandidateStage;
  experience_years: number;
  notes_count?: number;
  notes?: Note[];
  applied_at: string;
  updated_at?: string;
}

export type CandidateInput = Omit<
  CandidateRecord,
  'id' | 'applied_at' | 'updated_at' | 'notes' | 'notes_count'
>;

export interface CreateNoteInput {
  content: string;
}

export interface RecordsListResponse {
  total: number;
  page: number;
  limit: number;
  data: CandidateRecord[];
}

export interface NotesListResponse {
  data: Note[];
  meta?: {
    total?: number;
  };
}