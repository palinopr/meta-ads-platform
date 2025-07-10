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
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          owner_user_id: string
          subscription_tier: 'starter' | 'professional' | 'enterprise'
          status: 'active' | 'suspended' | 'trial'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_user_id: string
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'trial'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_user_id?: string
          subscription_tier?: 'starter' | 'professional' | 'enterprise'
          status?: 'active' | 'suspended' | 'trial'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string
          agency_id: string
          role: 'owner' | 'manager' | 'viewer'
          status: 'active' | 'inactive' | 'pending'
          invited_by: string | null
          invited_at: string
          joined_at: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agency_id: string
          role: 'owner' | 'manager' | 'viewer'
          status?: 'active' | 'inactive' | 'pending'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agency_id?: string
          role?: 'owner' | 'manager' | 'viewer'
          status?: 'active' | 'inactive' | 'pending'
          invited_by?: string | null
          invited_at?: string
          joined_at?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_accounts: {
        Row: {
          id: string
          agency_id: string
          meta_account_id: string
          client_name: string
          client_email: string | null
          status: 'active' | 'inactive' | 'paused'
          billing_contact: string | null
          notes: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          meta_account_id: string
          client_name: string
          client_email?: string | null
          status?: 'active' | 'inactive' | 'paused'
          billing_contact?: string | null
          notes?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          meta_account_id?: string
          client_name?: string
          client_email?: string | null
          status?: 'active' | 'inactive' | 'paused'
          billing_contact?: string | null
          notes?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      employee_client_access: {
        Row: {
          id: string
          employee_id: string
          client_account_id: string
          permissions: Json
          granted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          client_account_id: string
          permissions?: Json
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          client_account_id?: string
          permissions?: Json
          granted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin' | 'super_admin'
          meta_access_token: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          meta_access_token?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          company_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          meta_access_token?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      meta_ad_accounts: {
        Row: {
          id: string
          user_id: string
          agency_id: string | null
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
          agency_id?: string | null
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
          agency_id?: string | null
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
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          metadata: Json
          timestamp: string
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          metadata?: Json
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          metadata?: Json
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          created_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          identifier: string
          endpoint: string
          request_count: number
          window_start: string
          window_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          identifier: string
          endpoint: string
          request_count?: number
          window_start?: string
          window_end?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          endpoint?: string
          request_count?: number
          window_start?: string
          window_end?: string
          created_at?: string
          updated_at?: string
        }
      }
      security_incidents: {
        Row: {
          id: string
          incident_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          description: string | null
          metadata: Json
          ip_address: string | null
          user_id: string | null
          status: 'open' | 'investigating' | 'resolved' | 'false_positive'
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          incident_type: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          metadata?: Json
          ip_address?: string | null
          user_id?: string | null
          status?: 'open' | 'investigating' | 'resolved' | 'false_positive'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          incident_type?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          description?: string | null
          metadata?: Json
          ip_address?: string | null
          user_id?: string | null
          status?: 'open' | 'investigating' | 'resolved' | 'false_positive'
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_agency_with_owner: {
        Args: {
          p_name: string
          p_slug: string
          p_subscription_tier?: 'starter' | 'professional' | 'enterprise'
        }
        Returns: string
      }
      invite_employee: {
        Args: {
          p_agency_id: string
          p_email: string
          p_role?: 'owner' | 'manager' | 'viewer'
        }
        Returns: string
      }
      grant_client_access: {
        Args: {
          p_employee_id: string
          p_client_account_id: string
          p_permissions?: Json
        }
        Returns: string
      }
      get_user_agency_context: {
        Args: {}
        Returns: {
          agency_id: string
          agency_name: string
          agency_slug: string
          employee_role: 'owner' | 'manager' | 'viewer'
          employee_status: 'active' | 'inactive' | 'pending'
          subscription_tier: 'starter' | 'professional' | 'enterprise'
        }[]
      }
      cleanup_rate_limits: {
        Args: {}
        Returns: number
      }
      create_security_incident: {
        Args: {
          p_incident_type: string
          p_severity: 'low' | 'medium' | 'high' | 'critical'
          p_description?: string
          p_metadata?: Json
          p_ip_address?: string
          p_user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      agency_subscription_tier: 'starter' | 'professional' | 'enterprise'
      agency_status: 'active' | 'suspended' | 'trial'
      employee_role: 'owner' | 'manager' | 'viewer'
      employee_status: 'active' | 'inactive' | 'pending'
      client_account_status: 'active' | 'inactive' | 'paused'
      user_role: 'user' | 'admin' | 'super_admin'
      security_incident_severity: 'low' | 'medium' | 'high' | 'critical'
      security_incident_status: 'open' | 'investigating' | 'resolved' | 'false_positive'
    }
  }
}

// Additional type definitions for agency system
export interface AgencyPermissions {
  view: boolean
  edit: boolean
  manage: boolean
  export: boolean
  billing: boolean
}

export interface AgencySettings {
  theme?: 'light' | 'dark'
  timezone?: string
  currency?: string
  branding?: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
  }
  notifications?: {
    email_reports?: boolean
    slack_webhook?: string
    budget_alerts?: boolean
  }
}

export interface ClientAccountSettings {
  budget_alerts?: {
    daily_threshold?: number
    monthly_threshold?: number
    email_recipients?: string[]
  }
  reporting?: {
    frequency?: 'daily' | 'weekly' | 'monthly'
    metrics?: string[]
  }
}

// Helper types for agency context
export type AgencyRole = 'owner' | 'manager' | 'viewer'
export type EmployeeStatus = 'active' | 'inactive' | 'pending'
export type AgencySubscriptionTier = 'starter' | 'professional' | 'enterprise'
export type ClientAccountStatus = 'active' | 'inactive' | 'paused'

// Agency context interface for frontend usage
export interface AgencyContext {
  agency: Database['public']['Tables']['agencies']['Row']
  employee: Database['public']['Tables']['employees']['Row']
  permissions: {
    canManageEmployees: boolean
    canManageClients: boolean
    canAccessBilling: boolean
    canExportData: boolean
    isOwner: boolean
    isManager: boolean
    isViewer: boolean
  }
}

// Client access interface
export interface ClientAccess {
  client: Database['public']['Tables']['client_accounts']['Row']
  access: Database['public']['Tables']['employee_client_access']['Row']
  permissions: AgencyPermissions
}
