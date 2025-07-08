"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  disabled?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false
}: DateRangePickerProps) {
  return (
    <div className="flex items-center space-x-2">
      <DatePicker
        date={startDate}
        onDateChange={onStartDateChange}
        placeholder="Start date"
        disabled={disabled}
      />
      <span className="text-muted-foreground">to</span>
      <DatePicker
        date={endDate}
        onDateChange={onEndDateChange}
        placeholder="End date"
        disabled={disabled}
      />
    </div>
  )
}

interface QuickDateRangeProps {
  onRangeSelect: (startDate: Date, endDate: Date) => void
}

export function QuickDateRanges({ onRangeSelect }: QuickDateRangeProps) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const last7Days = new Date(today)
  last7Days.setDate(last7Days.getDate() - 7)
  
  const last30Days = new Date(today)
  last30Days.setDate(last30Days.getDate() - 30)
  
  const last90Days = new Date(today)
  last90Days.setDate(last90Days.getDate() - 90)
  
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

  const ranges = [
    { label: "Today", start: today, end: today },
    { label: "Yesterday", start: yesterday, end: yesterday },
    { label: "Last 7 days", start: last7Days, end: today },
    { label: "Last 30 days", start: last30Days, end: today },
    { label: "Last 90 days", start: last90Days, end: today },
    { label: "This month", start: thisMonth, end: today },
    { label: "Last month", start: lastMonth, end: lastMonthEnd },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {ranges.map((range) => (
        <Button
          key={range.label}
          variant="outline"
          size="sm"
          onClick={() => onRangeSelect(range.start, range.end)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  )
}
