// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// --- Admin Analytics ---
export interface AdminAnalytics {
  active_drivers: number;
  active_policies: number;
  claims_today: number;
  payouts_today_inr: number;
  total_premium_revenue_inr: number;
  total_payouts_inr: number;
  loss_ratio: number;
  active_triggers: number;
  flagged_claims: number;
}

// --- Driver Dashboard ---
export interface DriverDashboardData {
  profile: {
    full_name: string;
    city: string;
    trust_score: number;
  };
  policy: {
    tier: string;
    is_active: boolean;
    premium: number;
    week_start: string;
    week_end: string;
  } | null;
  wallet: {
    total_earned: number;
    this_week_earned: number;
    coins_balance: number;
  };
  claims_this_week: number;
  active_disruptions: number;
}
