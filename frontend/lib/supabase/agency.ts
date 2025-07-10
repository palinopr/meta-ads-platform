import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database, AgencyContext, AgencyRole, AgencyPermissions } from './database.types'

type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>

// Get current user's agency context
export async function getUserAgencyContext(supabase: SupabaseClient): Promise<AgencyContext | null> {
  try {
    const { data: context, error } = await supabase
      .rpc('get_user_agency_context')
    
    if (error) throw error
    if (!context || context.length === 0) return null

    const userContext = context[0]
    
    // Get full agency details
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', userContext.agency_id)
      .single()
    
    if (agencyError) throw agencyError

    // Get full employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('agency_id', userContext.agency_id)
      .single()
    
    if (employeeError) throw employeeError

    return {
      agency,
      employee,
      permissions: {
        canManageEmployees: employee.role === 'owner' || employee.role === 'manager',
        canManageClients: employee.role === 'owner' || employee.role === 'manager',
        canAccessBilling: employee.role === 'owner',
        canExportData: employee.role !== 'viewer',
        isOwner: employee.role === 'owner',
        isManager: employee.role === 'manager',
        isViewer: employee.role === 'viewer'
      }
    }
  } catch (error) {
    console.error('Error getting agency context:', error)
    return null
  }
}

// Create new agency
export async function createAgency(
  supabase: SupabaseClient,
  name: string,
  slug: string,
  subscriptionTier: 'starter' | 'professional' | 'enterprise' = 'starter'
): Promise<string | null> {
  try {
    const { data: agencyId, error } = await supabase
      .rpc('create_agency_with_owner', {
        p_name: name,
        p_slug: slug,
        p_subscription_tier: subscriptionTier
      })
    
    if (error) throw error
    return agencyId
  } catch (error) {
    console.error('Error creating agency:', error)
    return null
  }
}

// Invite employee to agency
export async function inviteEmployee(
  supabase: SupabaseClient,
  agencyId: string,
  email: string,
  role: AgencyRole = 'viewer'
): Promise<string | null> {
  try {
    const { data: employeeId, error } = await supabase
      .rpc('invite_employee', {
        p_agency_id: agencyId,
        p_email: email,
        p_role: role
      })
    
    if (error) throw error
    return employeeId
  } catch (error) {
    console.error('Error inviting employee:', error)
    return null
  }
}

// Get agency employees
export async function getAgencyEmployees(
  supabase: SupabaseClient,
  agencyId: string
) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting agency employees:', error)
    return []
  }
}

// Get agency client accounts
export async function getAgencyClients(
  supabase: SupabaseClient,
  agencyId: string
) {
  try {
    const { data, error } = await supabase
      .from('client_accounts')
      .select('*')
      .eq('agency_id', agencyId)
      .order('client_name', { ascending: true })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting agency clients:', error)
    return []
  }
}

// Get employee client access
export async function getEmployeeClientAccess(
  supabase: SupabaseClient,
  employeeId: string
) {
  try {
    const { data, error } = await supabase
      .from('employee_client_access')
      .select(`
        *,
        client_accounts (*)
      `)
      .eq('employee_id', employeeId)
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting employee client access:', error)
    return []
  }
}

// Grant client access to employee
export async function grantClientAccess(
  supabase: SupabaseClient,
  employeeId: string,
  clientAccountId: string,
  permissions: AgencyPermissions
): Promise<string | null> {
  try {
    const { data: accessId, error } = await supabase
      .rpc('grant_client_access', {
        p_employee_id: employeeId,
        p_client_account_id: clientAccountId,
        p_permissions: permissions
      })
    
    if (error) throw error
    return accessId
  } catch (error) {
    console.error('Error granting client access:', error)
    return null
  }
}

// Add client account to agency
export async function addClientAccount(
  supabase: SupabaseClient,
  agencyId: string,
  metaAccountId: string,
  clientName: string,
  clientEmail?: string,
  billingContact?: string,
  notes?: string
) {
  try {
    const { data, error } = await supabase
      .from('client_accounts')
      .insert({
        agency_id: agencyId,
        meta_account_id: metaAccountId,
        client_name: clientName,
        client_email: clientEmail,
        billing_contact: billingContact,
        notes: notes
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding client account:', error)
    return null
  }
}

// Update employee role
export async function updateEmployeeRole(
  supabase: SupabaseClient,
  employeeId: string,
  role: AgencyRole
) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ role })
      .eq('id', employeeId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating employee role:', error)
    return null
  }
}

// Update employee status
export async function updateEmployeeStatus(
  supabase: SupabaseClient,
  employeeId: string,
  status: 'active' | 'inactive'
) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update({ 
        status,
        joined_at: status === 'active' ? new Date().toISOString() : undefined
      })
      .eq('id', employeeId)
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating employee status:', error)
    return null
  }
}

// Check if user has permission for specific action
export function hasPermission(
  context: AgencyContext,
  action: 'manage_employees' | 'manage_clients' | 'access_billing' | 'export_data'
): boolean {
  switch (action) {
    case 'manage_employees':
      return context.permissions.canManageEmployees
    case 'manage_clients':
      return context.permissions.canManageClients
    case 'access_billing':
      return context.permissions.canAccessBilling
    case 'export_data':
      return context.permissions.canExportData
    default:
      return false
  }
}

// Get user's accessible Meta ad accounts through agency
export async function getUserAccessibleMetaAccounts(
  supabase: SupabaseClient,
  agencyId: string,
  employeeId: string
) {
  try {
    // Get user's agency context first
    const context = await getUserAgencyContext(supabase)
    if (!context) return []

    // If owner, get all agency accounts
    if (context.employee.role === 'owner') {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
      
      if (error) throw error
      return data || []
    }

    // For managers and viewers, get accounts through client access
    const { data, error } = await supabase
      .from('employee_client_access')
      .select(`
        permissions,
        client_accounts!inner (
          meta_account_id,
          client_name,
          meta_ad_accounts!inner (*)
        )
      `)
      .eq('employee_id', employeeId)
    
    if (error) throw error
    
    // Flatten the results and filter by view permission
    const accounts = data?.flatMap((access: any) => {
      if (access.permissions && (access.permissions as AgencyPermissions).view) {
        return access.client_accounts?.meta_ad_accounts || []
      }
      return []
    }) || []
    
    return accounts
  } catch (error) {
    console.error('Error getting accessible Meta accounts:', error)
    return []
  }
}

// Server-side function for getting agency context (for server components)
export async function getServerAgencyContext(): Promise<AgencyContext | null> {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    const { data: context, error } = await supabase
      .rpc('get_user_agency_context')
    
    if (error) throw error
    if (!context || context.length === 0) return null

    const userContext = context[0]
    
    // Get full agency details
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('*')
      .eq('id', userContext.agency_id)
      .single()
    
    if (agencyError) throw agencyError

    // Get full employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('agency_id', userContext.agency_id)
      .single()
    
    if (employeeError) throw employeeError

    return {
      agency,
      employee,
      permissions: {
        canManageEmployees: employee.role === 'owner' || employee.role === 'manager',
        canManageClients: employee.role === 'owner' || employee.role === 'manager',
        canAccessBilling: employee.role === 'owner',
        canExportData: employee.role !== 'viewer',
        isOwner: employee.role === 'owner',
        isManager: employee.role === 'manager',
        isViewer: employee.role === 'viewer'
      }
    }
  } catch (error) {
    console.error('Error getting server agency context:', error)
    return null
  }
}
