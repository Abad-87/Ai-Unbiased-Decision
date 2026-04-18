/**
 * api.ts — typed client for the Quantum backend.
 *
 * Base URL: VITE_API_BASE_URL env var (dev: http://localhost:8000).
 * Create frontend/.env.local with VITE_API_BASE_URL=http://localhost:8000
 * Set the same var in Netlify/Vercel for production pointing to Render URL.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail ?? `POST ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface BiasRisk {
  score:                 number;
  band:                  "low" | "moderate" | "high";
  flag_for_review:       boolean;
  recommendation:        string;
  post_processing_applied: boolean;
}

export interface GroupMetrics {
  group:          string;
  n:              number;
  positive_rate:  number;
  avg_confidence: number;
  labelled_count: number;
  accuracy:       number | null;
}

export interface SummaryResponse {
  domain:                        string;
  n_records:                     number;
  labelled_count:                number;
  sensitive_attributes_detected: string[];
  demographic_parity_difference: number | null;
  equal_opportunity_difference:  number | null;
  per_group:                     GroupMetrics[];
  post_processing:               Record<string, unknown> | null;
  notes:                         string[];
}

export interface RecentPrediction {
  correlation_id:        string | null;
  domain:                string;
  prediction:            number;
  prediction_label:      string | null;
  confidence:            number;
  sensitive_value_group: string | null;
  ground_truth:          number | null;
  timestamp:             string | null;
  bias_risk:             BiasRisk | null;
}

export interface RecentResponse {
  domain:  string;
  count:   number;
  records: RecentPrediction[];
}

// ─── Request / Response types per domain ──────────────────────────────────────

export interface HiringRequest {
  years_experience:    number;   // 0–50
  education_level:     number;   // 0=HS 1=BSc 2=MSc 3=PhD
  technical_score:     number;   // 0–100
  communication_score: number;   // 0–100
  num_past_jobs:       number;   // 0–30
  certifications?:     number;   // 0–20, default 0
  gender?:             string;
  ethnicity?:          string;
}

export interface HiringResponse {
  prediction:       number;       // 0 or 1
  prediction_label: string;       // "Hired" | "Not Hired"
  confidence:       number;       // 0–1
  explanation:      string[];
  bias_risk:        BiasRisk;
  fairness:         Record<string, unknown>;
  correlation_id:   string;
  message:          string;
}

export interface LoanRequest {
  credit_score:      number;   // 300–850
  annual_income:     number;   // USD
  loan_amount:       number;   // USD
  loan_term_months:  number;   // 6|12|18|24|30|36|48|60|84|120|180|240|360
  employment_years:  number;   // 0–50
  existing_debt?:    number;   // default 0
  num_credit_lines?: number;   // default 0
  gender?:           string;
  age_group?:        string;   // e.g. "26-40" or "65+"
  ethnicity?:        string;
}

export interface LoanResponse {
  prediction:       number;       // 0 or 1
  prediction_label: string;       // "Approved" | "Rejected"
  confidence:       number;
  explanation:      string[];
  bias_risk:        BiasRisk;
  fairness:         Record<string, unknown>;
  correlation_id:   string;
  message:          string;
}

export interface SocialRequest {
  avg_session_minutes: number;   // 0–1440
  topics_interacted:   number;   // 0–50 (integer)
  like_rate:           number;   // 0–1
  posts_per_day?:      number;   // default 0
  share_rate?:         number;   // default 0
  comment_rate?:       number;   // default 0
  account_age_days?:   number;   // default 0
  gender?:             string;
  age_group?:          string;
  location?:           string;
  language?:           string;
}

export interface SocialResponse {
  recommended_category_id: number;
  recommended_category:    string;
  confidence:              number;
  explanation:             string[];
  bias_risk:               BiasRisk;
  fairness:                Record<string, unknown>;
  correlation_id:          string;
  message:                 string;
}

export interface FeedbackRequest {
  correlation_id: string;
  ground_truth:   number;
}

export interface FeedbackResponse {
  correlation_id: string;
  updated:        boolean;   // backend field is "updated", not "success"
  message:        string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: () =>
    get<Record<string, unknown>>("/health"),

  // Insights (read-only, powers Dashboard + BiasDetection)
  getSummary: (domain: "hiring" | "loan" | "social") =>
    get<SummaryResponse>(`/insights/${domain}/summary`),

  getRecent: (domain: "hiring" | "loan" | "social", limit = 100) =>
    get<RecentResponse>(`/insights/${domain}/recent?limit=${limit}`),

  // Predictions (powers FairnessExplorer)
  predictHiring: (body: HiringRequest) =>
    post<HiringResponse>("/hiring/predict", body),

  predictLoan: (body: LoanRequest) =>
    post<LoanResponse>("/loan/predict", body),

  predictSocial: (body: SocialRequest) =>
    post<SocialResponse>("/social/recommend", body),

  // Feedback (attach ground-truth to a previous prediction)
  feedback: (body: FeedbackRequest) =>
    post<FeedbackResponse>("/feedback", body),
};
