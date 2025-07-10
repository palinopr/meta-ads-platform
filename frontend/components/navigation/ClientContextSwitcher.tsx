'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Building2, Search, Users, Globe, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface ClientAccount {
  id: string
  name: string
  status: 'active' | 'paused' | 'inactive'
  currency: string
  spend_cap: number
  account_type: 'business' | 'personal'
  business_name?: string
  timezone_name: string
  employee_access_level?: 'owner' | 'manager' | 'viewer'
}

interface ClientContextSwitcherProps {
  clients: ClientAccount[]
  selectedClient?: ClientAccount
  onClientSelect: (client: ClientAccount) => void
  className?: string
}

export function ClientContextSwitcher({
  clients,
  selectedClient,
  onClientSelect,
  className
}: ClientContextSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter clients based on search query
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.id.includes(searchQuery) ||
    client.currency.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group clients by status
  const groupedClients = {
    active: filteredClients.filter(client => client.status === 'active'),
    paused: filteredClients.filter(client => client.status === 'paused'),
    inactive: filteredClients.filter(client => client.status === 'inactive'),
  }

  const getStatusColour = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-agency-success-500 text-white'
      case 'paused':
        return 'bg-agency-warning-500 text-white'
      case 'inactive':
        return 'bg-agency-secondary-500 text-white'
      default:
        return 'bg-agency-secondary-500 text-white'
    }
  }

  const getAccessLevelIcon = (level?: string) => {
    switch (level) {
      case 'owner':
        return <Crown className="h-3 w-3 text-agency-warning-400" />
      case 'manager':
        return <Users className="h-3 w-3 text-agency-primary-400" />
      case 'viewer':
        return <Globe className="h-3 w-3 text-agency-secondary-400" />
      default:
        return null
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-agency-secondary-900 border-agency-secondary-700 text-white hover:bg-agency-secondary-800 hover:border-agency-secondary-600"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-agency-primary-500 to-agency-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                {selectedClient ? (
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">{selectedClient.name}</span>
                      <Badge variant="outline" className={cn('text-xs', getStatusColour(selectedClient.status))}>
                        {selectedClient.status}
                      </Badge>
                      {getAccessLevelIcon(selectedClient.employee_access_level)}
                    </div>
                    <div className="text-xs text-agency-secondary-400 truncate">
                      {selectedClient.business_name || selectedClient.id} • {selectedClient.currency}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-medium">Select Client</span>
                    <div className="text-xs text-agency-secondary-400">
                      Choose a client account to manage
                    </div>
                  </div>
                )}\n              </div>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-agency-secondary-900 border-agency-secondary-700">
          <Command className="bg-agency-secondary-900">
            <div className="flex items-center border-b border-agency-secondary-700 px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-agency-secondary-400" />
              <input
                placeholder="Search clients by name, ID, or currency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-agency-secondary-400 disabled:cursor-not-allowed disabled:opacity-50 text-white"
              />
            </div>
            <CommandList className="max-h-[300px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-agency-secondary-400">
                  No clients found matching your search.
                </CommandEmpty>
              ) : (
                <>
                  {Object.entries(groupedClients).map(([status, clients]) => {
                    if (clients.length === 0) return null
                    
                    return (
                      <CommandGroup 
                        key={status} 
                        heading={
                          <div className="flex items-center space-x-2">
                            <span className="capitalize text-agency-secondary-300">{status} Clients</span>
                            <Badge variant="outline" className="text-xs bg-agency-secondary-800 text-agency-secondary-300">
                              {clients.length}
                            </Badge>
                          </div>
                        }
                        className="text-agency-secondary-300"
                      >
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.name} ${client.business_name} ${client.id} ${client.currency}`}
                            onSelect={() => {
                              onClientSelect(client)
                              setOpen(false)
                              setSearchQuery('')
                            }}
                            className="cursor-pointer hover:bg-agency-secondary-800 text-white"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                client.status === 'active' 
                                  ? 'bg-gradient-to-br from-agency-success-500 to-agency-success-600'
                                  : client.status === 'paused'
                                  ? 'bg-gradient-to-br from-agency-warning-500 to-agency-warning-600'
                                  : 'bg-gradient-to-br from-agency-secondary-600 to-agency-secondary-700'
                              )}>
                                <Building2 className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium truncate">{client.name}</span>
                                  <Badge variant="outline" className={cn('text-xs', getStatusColour(client.status))}>
                                    {client.status}
                                  </Badge>
                                  {getAccessLevelIcon(client.employee_access_level)}
                                </div>
                                <div className="text-xs text-agency-secondary-400 truncate">
                                  {client.business_name && (
                                    <span>{client.business_name} • </span>
                                  )}
                                  <span>ID: {client.id} • </span>
                                  <span>{client.currency}</span>
                                  {client.spend_cap > 0 && (
                                    <span> • Cap: {formatCurrency(client.spend_cap, client.currency)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Check
                              className={cn(
                                'ml-2 h-4 w-4',
                                selectedClient?.id === client.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  })}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedClient && (
        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-agency-secondary-800/50 to-agency-secondary-700/50 border border-agency-secondary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-agency-secondary-300">Active Client Context</span>
              {getAccessLevelIcon(selectedClient.employee_access_level)}
            </div>
            <Badge variant="outline" className="text-xs bg-agency-primary-500/20 text-agency-primary-300 border-agency-primary-500/30">
              {selectedClient.employee_access_level || 'member'}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-agency-secondary-400">
            <span>Timezone: {selectedClient.timezone_name}</span>
            {selectedClient.spend_cap > 0 && (
              <span> • Spend Cap: {formatCurrency(selectedClient.spend_cap, selectedClient.currency)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
