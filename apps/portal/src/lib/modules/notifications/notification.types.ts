export interface Notification {
  id: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
}
