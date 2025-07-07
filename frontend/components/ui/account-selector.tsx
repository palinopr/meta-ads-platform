'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, Building2, DollarSign, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface Account {
  account_id: string
  account_name: string
  currency?: string
  status?: string
  is_active?: boolean
}

interface AccountSelectorProps {
  accounts: Account[]
  value: string | null
  onValueChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function AccountSelector({
  accounts,
  value,
  onValueChange,
  placeholder = "Select an account...",
  className
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!searchValue) return accounts
    
    const search = searchValue.toLowerCase()
    return accounts.filter(account => 
      account.account_name.toLowerCase().includes(search) ||
      account.account_id.toLowerCase().includes(search) ||
      account.currency?.toLowerCase().includes(search)
    )
  }, [accounts, searchValue])

  // Group accounts by status
  const groupedAccounts = useMemo(() => {
    const active = filteredAccounts.filter(acc => acc.is_active !== false)
    const inactive = filteredAccounts.filter(acc => acc.is_active === false)
    return { active, inactive }
  }, [filteredAccounts])

  // Get selected account details
  const selectedAccount = accounts.find(acc => acc.account_id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value && selectedAccount ? (
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedAccount.account_name}</span>
              <Badge variant="secondary" className="ml-auto">
                {selectedAccount.account_id}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by name, ID, or currency..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="text-center py-6">
                <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No accounts found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching by name, ID, or currency</p>
              </div>
            </CommandEmpty>
            
            {groupedAccounts.active.length > 0 && (
              <CommandGroup heading={`Active Accounts (${groupedAccounts.active.length})`}>
                {groupedAccounts.active.slice(0, 50).map((account) => (
                  <CommandItem
                    key={account.account_id}
                    value={account.account_id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? null : currentValue)
                      setOpen(false)
                      setSearchValue('')
                    }}
                    className="py-3"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.account_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{account.account_name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {account.account_id}
                          </span>
                          {account.currency && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {account.currency}
                            </span>
                          )}
                        </div>
                      </div>
                      {account.status && (
                        <Badge 
                          variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {account.status}
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {groupedAccounts.active.length > 50 && (
                  <div className="py-2 px-2 text-sm text-muted-foreground text-center">
                    Showing first 50 results. Type to search more specifically.
                  </div>
                )}
              </CommandGroup>
            )}
            
            {groupedAccounts.active.length > 0 && groupedAccounts.inactive.length > 0 && (
              <CommandSeparator />
            )}
            
            {groupedAccounts.inactive.length > 0 && (
              <CommandGroup heading={`Inactive Accounts (${groupedAccounts.inactive.length})`}>
                {groupedAccounts.inactive.slice(0, 20).map((account) => (
                  <CommandItem
                    key={account.account_id}
                    value={account.account_id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? null : currentValue)
                      setOpen(false)
                      setSearchValue('')
                    }}
                    className="py-3 opacity-60"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.account_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{account.account_name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {account.account_id}
                          </span>
                          {account.currency && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {account.currency}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        INACTIVE
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="border-t px-2 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Total: {accounts.length} accounts • Use ↑↓ to navigate • Enter to select
            </p>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}