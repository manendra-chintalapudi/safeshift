// ============================================================================
// Supabase Database Type Definition
// This provides type safety for Supabase client operations
// In production, generate with: npx supabase gen types typescript
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          language: string;
          aadhaar_verified: boolean;
          aadhaar_hash: string | null;
          dl_number: string | null;
          dl_verified: boolean;
          dl_image_url: string | null;
          rc_number: string | null;
          rc_verified: boolean;
          rc_image_url: string | null;
          vehicle_hash: string | null;
          upi_id: string | null;
          upi_verified: boolean;
          city: string | null;
          zone_latitude: number | null;
          zone_longitude: number | null;
          onboarding_status: string;
          role: string;
          trust_score: number;
          referral_code: string | null;
          referred_by: string | null;
          device_fingerprint: string | null;
          razorpay_customer_id: string | null;
          razorpay_subscription_id: string | null;
          auto_renew_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      plan_packages: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tier: string;
          weekly_premium_inr: number;
          max_weekly_payout_inr: number;
          payout_schedule: Json;
          razorpay_plan_id: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['plan_packages']['Row']>;
        Update: Partial<Database['public']['Tables']['plan_packages']['Row']>;
      };
      weekly_policies: {
        Row: {
          id: string;
          profile_id: string;
          plan_id: string | null;
          week_start_date: string;
          week_end_date: string;
          base_premium_inr: number;
          weather_risk_addon: number;
          ubi_addon: number;
          final_premium_inr: number;
          premium_reasoning: string | null;
          is_active: boolean;
          payment_status: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_subscription_id: string | null;
          total_payout_this_week: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['weekly_policies']['Row']> & {
          profile_id: string;
          week_start_date: string;
          week_end_date: string;
          base_premium_inr: number;
          final_premium_inr: number;
        };
        Update: Partial<Database['public']['Tables']['weekly_policies']['Row']>;
      };
      live_disruption_events: {
        Row: {
          id: string;
          event_type: string;
          severity_score: number;
          city: string;
          zone_latitude: number | null;
          zone_longitude: number | null;
          geofence_radius_km: number;
          trigger_value: number | null;
          trigger_threshold: number | null;
          verified_by_api: boolean;
          verified_by_llm: boolean;
          raw_api_data: Json | null;
          data_sources: string[] | null;
          rule_version: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['live_disruption_events']['Row']> & {
          event_type: string;
          severity_score: number;
          city: string;
        };
        Update: Partial<Database['public']['Tables']['live_disruption_events']['Row']>;
      };
      parametric_claims: {
        Row: {
          id: string;
          policy_id: string;
          profile_id: string;
          disruption_event_id: string;
          payout_amount_inr: number;
          status: string;
          gate1_passed: boolean | null;
          gate1_checked_at: string | null;
          gate2_passed: boolean | null;
          gate2_checked_at: string | null;
          activity_minutes: number | null;
          gps_within_zone: boolean | null;
          is_flagged: boolean;
          flag_reason: string | null;
          fraud_score: number;
          fraud_signals: Json;
          device_fingerprint: string | null;
          admin_review_status: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          gateway_transaction_id: string | null;
          payout_initiated_at: string | null;
          payout_completed_at: string | null;
          appeal_submitted_at: string | null;
          appeal_evidence_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['parametric_claims']['Row']> & {
          policy_id: string;
          profile_id: string;
          disruption_event_id: string;
          payout_amount_inr: number;
        };
        Update: Partial<Database['public']['Tables']['parametric_claims']['Row']>;
      };
      driver_activity_logs: {
        Row: {
          id: string;
          profile_id: string;
          status: string;
          latitude: number | null;
          longitude: number | null;
          ip_address: string | null;
          ip_geo_latitude: number | null;
          ip_geo_longitude: number | null;
          device_fingerprint: string | null;
          recorded_at: string;
        };
        Insert: Partial<Database['public']['Tables']['driver_activity_logs']['Row']> & {
          profile_id: string;
          status: string;
        };
        Update: Partial<Database['public']['Tables']['driver_activity_logs']['Row']>;
      };
      vehicle_asset_locks: {
        Row: {
          id: string;
          vehicle_hash: string;
          profile_id: string;
          claim_id: string | null;
          locked_at: string;
          expires_at: string;
        };
        Insert: Partial<Database['public']['Tables']['vehicle_asset_locks']['Row']> & {
          vehicle_hash: string;
          profile_id: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['vehicle_asset_locks']['Row']>;
      };
      coins_ledger: {
        Row: {
          id: string;
          profile_id: string;
          activity: string;
          coins: number;
          description: string | null;
          reference_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['coins_ledger']['Row']> & {
          profile_id: string;
          activity: string;
          coins: number;
        };
        Update: Partial<Database['public']['Tables']['coins_ledger']['Row']>;
      };
      payout_ledger: {
        Row: {
          id: string;
          claim_id: string;
          profile_id: string;
          amount_inr: number;
          payout_method: string;
          status: string;
          mock_upi_ref: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payout_ledger']['Row']> & {
          claim_id: string;
          profile_id: string;
          amount_inr: number;
        };
        Update: Partial<Database['public']['Tables']['payout_ledger']['Row']>;
      };
      premium_recommendations: {
        Row: {
          id: string;
          profile_id: string;
          week_start_date: string;
          base_premium: number;
          weather_risk: number;
          ubi_adjustment: number;
          final_premium: number;
          reasoning: string | null;
          forecast_data: Json | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['premium_recommendations']['Row']> & {
          profile_id: string;
          week_start_date: string;
          base_premium: number;
          final_premium: number;
        };
        Update: Partial<Database['public']['Tables']['premium_recommendations']['Row']>;
      };
      system_logs: {
        Row: {
          id: string;
          event_type: string;
          severity: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['system_logs']['Row']> & {
          event_type: string;
        };
        Update: Partial<Database['public']['Tables']['system_logs']['Row']>;
      };
      parametric_trigger_ledger: {
        Row: {
          id: string;
          adjudicator_run_id: string | null;
          event_type: string | null;
          city: string | null;
          trigger_value: number | null;
          outcome: string | null;
          claims_created: number;
          payouts_initiated: number;
          error_message: string | null;
          rule_version: string | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['parametric_trigger_ledger']['Row']>;
        Update: Partial<Database['public']['Tables']['parametric_trigger_ledger']['Row']>;
      };
      payment_transactions: {
        Row: {
          id: string;
          profile_id: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount_inr: number;
          status: string;
          policy_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['payment_transactions']['Row']> & {
          profile_id: string;
          amount_inr: number;
        };
        Update: Partial<Database['public']['Tables']['payment_transactions']['Row']>;
      };
      razorpay_payment_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          payload: Json;
          processed: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['razorpay_payment_events']['Row']> & {
          event_id: string;
          event_type: string;
          payload: Json;
        };
        Update: Partial<Database['public']['Tables']['razorpay_payment_events']['Row']>;
      };
    };
    Views: {
      driver_wallet: {
        Row: {
          driver_id: string;
          total_earned_inr: number;
          total_claims: number;
          flagged_claims: number;
          last_payout_at: string | null;
          this_week_earned_inr: number;
        };
      };
      driver_coin_balance: {
        Row: {
          profile_id: string;
          balance: number;
        };
      };
      fraud_cluster_signals: {
        Row: {
          disruption_event_id: string;
          event_type: string;
          city: string;
          claim_count: number;
          first_claim_at: string;
          last_claim_at: string;
          window_seconds: number;
          unique_devices: number;
          flag_rate: number;
        };
      };
      admin_analytics_summary: {
        Row: {
          total_drivers: number;
          active_drivers: number;
          active_policies: number;
          claims_today: number;
          payouts_today_inr: number;
          total_premium_revenue_inr: number;
          total_payouts_inr: number;
          active_triggers: number;
          pending_fraud_reviews: number;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      disruption_type: 'heavy_rainfall' | 'aqi_grap_iv' | 'cyclone' | 'platform_outage' | 'curfew_bandh';
      claim_status: 'triggered' | 'gate1_passed' | 'gate2_passed' | 'approved' | 'paid' | 'rejected' | 'pending_review' | 'appealed';
      tier_type: 'normal' | 'medium' | 'high';
      onboarding_status: 'language_selected' | 'aadhaar_verified' | 'documents_uploaded' | 'upi_verified' | 'city_selected' | 'tier_selected' | 'payment_done' | 'complete';
      coin_activity_type: 'weekly_login' | 'consecutive_weeks' | 'disruption_active' | 'referral' | 'complete_profile' | 'clean_claims' | 'redeemed_discount' | 'redeemed_free_week';
    };
  };
}
