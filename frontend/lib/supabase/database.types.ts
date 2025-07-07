export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      meta_ad_accounts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          account_name: string | null
          currency: string | null
          timezone_name: string | null
          status: string | null
          spend_cap: number | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          account_name?: string | null
          currency?: string | null
          timezone_name?: string | null
          status?: string | null
          spend_cap?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          account_name?: string | null
          currency?: string | null
          timezone_name?: string | null
          status?: string | null
          spend_cap?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      campaigns: {
        Row: {
          id: string
          ad_account_id: string
          campaign_id: string
          name: string | null
          status: string | null
          objective: string | null
          buying_type: string | null
          budget_remaining: number | null
          daily_budget: number | null
          lifetime_budget: number | null
          bid_strategy: string | null
          created_time: string | null
          updated_time: string | null
          start_time: string | null
          stop_time: string | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          ad_account_id: string
          campaign_id: string
          name?: string | null
          status?: string | null
          objective?: string | null
          buying_type?: string | null
          budget_remaining?: number | null
          daily_budget?: number | null
          lifetime_budget?: number | null
          bid_strategy?: string | null
          created_time?: string | null
          updated_time?: string | null
          start_time?: string | null
          stop_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          ad_account_id?: string
          campaign_id?: string
          name?: string | null
          status?: string | null
          objective?: string | null
          buying_type?: string | null
          budget_remaining?: number | null
          daily_budget?: number | null
          lifetime_budget?: number | null
          bid_strategy?: string | null
          created_time?: string | null
          updated_time?: string | null
          start_time?: string | null
          stop_time?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      campaign_metrics: {
        Row: {
          id: string
          campaign_id: string
          date_start: string
          date_stop: string
          impressions: number
          clicks: number
          ctr: number
          cpc: number
          cpm: number
          cpp: number
          conversions: number
          conversion_rate: number
          cost_per_conversion: number
          spend: number
          purchase_value: number
          roas: number
          reach: number
          frequency: number
          engagement_rate: number
          video_views: number
          video_view_rate: number
          cost_per_thruplay: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          campaign_id: string
          date_start: string
          date_stop: string
          impressions?: number
          clicks?: number
          ctr?: number
          cpc?: number
          cpm?: number
          cpp?: number
          conversions?: number
          conversion_rate?: number
          cost_per_conversion?: number
          spend?: number
          purchase_value?: number
          roas?: number
          reach?: number
          frequency?: number
          engagement_rate?: number
          video_views?: number
          video_view_rate?: number
          cost_per_thruplay?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          campaign_id?: string
          date_start?: string
          date_stop?: string
          impressions?: number
          clicks?: number
          ctr?: number
          cpc?: number
          cpm?: number
          cpp?: number
          conversions?: number
          conversion_rate?: number
          cost_per_conversion?: number
          spend?: number
          purchase_value?: number
          roas?: number
          reach?: number
          frequency?: number
          engagement_rate?: number
          video_views?: number
          video_view_rate?: number
          cost_per_thruplay?: number
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}