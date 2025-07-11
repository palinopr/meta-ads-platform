"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerWithPresetsProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  className?: string
  align?: "start" | "center" | "end"
  placeholder?: string
}

export function DateRangePickerWithPresets({
  date,
  onDateChange,
  className,
  align = "start",
  placeholder = "Select date range"
}: DateRangePickerWithPresetsProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("custom")

  const presets = [
    {
      value: "7d",
      label: "Last 7 days",
      getRange: () => ({
        from: subDays(new Date(), 6),
        to: new Date()
      })
    },
    {
      value: "30d",
      label: "Last 30 days",
      getRange: () => ({
        from: subDays(new Date(), 29),
        to: new Date()
      })
    },
    {
      value: "90d",
      label: "Last 90 days",
      getRange: () => ({
        from: subDays(new Date(), 89),
        to: new Date()
      })
    },
    {
      value: "this-month",
      label: "This month",
      getRange: () => ({
        from: startOfMonth(new Date()),
        to: new Date()
      })
    },
    {
      value: "last-month",
      label: "Last month",
      getRange: () => {
        const today = new Date()
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        }
      }
    },
    {
      value: "year-to-date",
      label: "Year to date",
      getRange: () => ({
        from: startOfYear(new Date()),
        to: new Date()
      })
    }
  ]

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value)
    if (value !== "custom") {
      const preset = presets.find(p => p.value === value)
      if (preset) {
        const range = preset.getRange()
        onDateChange?.(range)
      }
    }
  }

  const formatDateRange = () => {
    if (!date?.from) return placeholder
    if (date.to) {
      return `${format(date.from, "MMM d, yyyy")} - ${format(date.to, "MMM d, yyyy")}`
    }
    return format(date.from, "MMM d, yyyy")
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
              "bg-background/60 backdrop-blur-sm border-gray-700 hover:bg-gray-800 hover:border-gray-600"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-gray-900 border-gray-700" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              if (newDate) {
                setSelectedPreset("custom")
              }
            }}
            numberOfMonths={2}
            className="bg-gray-900"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}