export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  email_verified: boolean;
  is_staff: boolean;
  referral_code: string;
}
export interface Package {
  id: string;
  name: string;
  credits: string;
  price_kes: number;
  subscription_days: number;
}
export interface Config {
  brand: string;
  development: boolean;
  detection_mock: boolean;
  rewrite_mock: boolean;
  payment_provider: string;
  retention_days: number;
  max_words: number;
  prices: { kind: string; credits: string; word_allowance: number }[];
  packages: Package[];
}
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export interface Doc {
  id: string;
  title: string;
  word_count: number;
  format: string;
  created_at: string;
}
export interface Job {
  id: string;
  document: string;
  title: string;
  kind: string;
  status: string;
  cost: string;
  provider: string;
  error: string;
  report_id: string | null;
  original_text: string | null;
  created_at: string;
  result: {
    mock?: boolean;
    similarity?: number | null;
    ai_likelihood?: number | null;
    human_likelihood?: number | null;
    rewritten_text?: string | null;
    notes?: string;
    limitations?: string;
    sources?: { title: string; url: string; passage?: string }[];
    sentences?: { text: string; ai_likelihood: number | null }[];
  };
}
export interface Payment {
  id: string;
  package_name: string;
  amount: number;
  credits: string;
  provider: string;
  status: string;
  receipt: string | null;
  error: string;
  created_at: string;
}
export interface Report {
  id: string;
  job_id: string;
  title: string;
  kind: string;
  mock: boolean;
  created_at: string;
}
export interface Ledger {
  id: string;
  kind: string;
  amount: string;
  reserved_delta: string;
  balance_after: string;
  created_at: string;
  reference: string;
  note: string;
}
export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  reply: string;
  created_at: string;
}
export interface Notice {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
export interface Subscription {
  id: string;
  name: string;
  ends_at: string;
  cancelled: boolean;
}
