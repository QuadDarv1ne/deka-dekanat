export type RequestStatus = 'new' | 'in_progress' | 'ready' | 'done' | 'rejected' | 'cancelled';
export type RequestKind = 'study' | 'scholarship' | 'tax' | 'leave' | 'transfer' | 'other';
export interface StudyRequest {
  id: string;
  number: string;
  student_id: string;
  student_name: string;
  group_name: string;
  kind: RequestKind;
  details: string;
  status: RequestStatus;
  staff_note: string;
  verification_code: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface RequestEvent {
  id: string;
  status: RequestStatus;
  note: string;
  created_at: string;
  actor: string;
}
export interface RequestMessage {
  submission_id: string;
  sender_name: string;
  mine: boolean;
  body: string;
  created_at: string;
}
export interface DocumentVerification {
  number: string;
  kind: RequestKind;
  updated_at: string;
}
