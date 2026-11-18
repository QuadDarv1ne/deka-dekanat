export interface StudentCard {
  student_id: string;
  number: string;
  verification_code: string;
  issued_at: string;
  full_name: string;
  faculty_name: string;
  group_name: string;
  program: string;
  course: number;
}
export interface CardPresentation {
  card: StudentCard;
  number: string;
  verificationUrl: string;
  qr: string;
}
