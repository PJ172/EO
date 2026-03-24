"use client"

import * as React from "react"
import { format, isValid, parse, addMonths, subMonths, setMonth, setYear } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { ScrollArea } from "@/components/ui/scroll-area"

interface DatePickerProps {
    value?: Date | string | null
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    minYear?: number
    maxYear?: number
}

const MONTHS_VI = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
]

const WEEKDAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
    // Returns 0 (Sunday) - 6 (Saturday)
    const day = new Date(year, month, 1).getDay()
    // Convert to Monday-based: Mon=0, Tue=1, ..., Sun=6
    return day === 0 ? 6 : day - 1
}

export function DatePicker({
    value,
    onChange,
    placeholder = "dd/MM/yyyy",
    className,
    disabled = false,
    minYear = 1900,
    maxYear = 2100,
}: DatePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
    const [inputValue, setInputValue] = React.useState("")
    const [viewMonth, setViewMonth] = React.useState(new Date().getMonth())
    const [viewYear, setViewYear] = React.useState(new Date().getFullYear())
    const [isOpen, setIsOpen] = React.useState(false)

    // Sync state with props
    React.useEffect(() => {
        if (!value) {
            setSelectedDate(undefined)
            setInputValue("")
            return
        }

        let parsed: Date | undefined
        if (value instanceof Date) {
            parsed = value
        } else if (typeof value === "string") {
            if (value.startsWith("0001-01-01") || value === "") {
                setSelectedDate(undefined)
                setInputValue("")
                return
            }
            parsed = new Date(value)
        }

        if (parsed && isValid(parsed) && parsed.getFullYear() > 1000) {
            setSelectedDate(parsed)
            setInputValue(format(parsed, "dd/MM/yyyy"))
            setViewMonth(parsed.getMonth())
            setViewYear(parsed.getFullYear())
        } else {
            setSelectedDate(undefined)
            setInputValue("")
        }
    }, [value])

    const handleSelectDay = (day: number) => {
        const newDate = new Date(viewYear, viewMonth, day)
        setSelectedDate(newDate)
        setInputValue(format(newDate, "dd/MM/yyyy"))
        onChange?.(newDate)
        setIsOpen(false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)

        if (val.length === 10) {
            const parsed = parse(val, "dd/MM/yyyy", new Date())
            if (isValid(parsed) && parsed.getFullYear() > 1000) {
                setSelectedDate(parsed)
                setViewMonth(parsed.getMonth())
                setViewYear(parsed.getFullYear())
                onChange?.(parsed)
            } else {
                setSelectedDate(undefined)
                onChange?.(undefined)
            }
        } else if (val === "") {
            setSelectedDate(undefined)
            onChange?.(undefined)
        }
    }

    const handleInputBlur = () => {
        if (inputValue === "") {
            setSelectedDate(undefined)
            onChange?.(undefined)
            return
        }

        // Try to parse flexible formats
        const formats = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd"];
        let parsed: Date | undefined;

        for (const fmt of formats) {
            const d = parse(inputValue, fmt, new Date());
            if (isValid(d) && d.getFullYear() > 1000 && d.getFullYear() < 3000) {
                parsed = d;
                break;
            }
        }

        if (parsed) {
            setSelectedDate(parsed)
            setInputValue(format(parsed, "dd/MM/yyyy"))
            setViewMonth(parsed.getMonth())
            setViewYear(parsed.getFullYear())
            onChange?.(parsed)
        } else {
            // Revert to valid selected date if exists, or clear
            if (selectedDate) {
                setInputValue(format(selectedDate, "dd/MM/yyyy"))
            } else {
                setInputValue("")
                onChange?.(undefined)
            }
        }
    }

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11)
            setViewYear(viewYear - 1)
        } else {
            setViewMonth(viewMonth - 1)
        }
    }

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0)
            setViewYear(viewYear + 1)
        } else {
            setViewMonth(viewMonth + 1)
        }
    }

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

    // Previous month's trailing days
    const prevMonthDays = getDaysInMonth(
        viewMonth === 0 ? viewYear - 1 : viewYear,
        viewMonth === 0 ? 11 : viewMonth - 1
    )

    // Build calendar grid
    const calendarDays: { day: number; isCurrentMonth: boolean }[] = []

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, isCurrentMonth: true })
    }

    // Next month leading days
    const remaining = 42 - calendarDays.length
    for (let i = 1; i <= remaining; i++) {
        calendarDays.push({ day: i, isCurrentMonth: false })
    }

    const today = new Date()
    const isToday = (day: number) =>
        day === today.getDate() &&
        viewMonth === today.getMonth() &&
        viewYear === today.getFullYear()

    const isSelected = (day: number) =>
        selectedDate &&
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear === selectedDate.getFullYear()

    // Generate year options
    const years = []
    for (let y = maxYear; y >= minYear; y--) {
        years.push(y)
    }

    return (
        <div className={cn("relative w-full", className)}>
            <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder={placeholder}
                disabled={disabled}
                className={cn("pr-10 w-full")}
            />
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                        disabled={disabled}
                        tabIndex={-1}
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 min-w-[280px]">
                        {/* Header: Month Year + Navigation */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                                {/* Month select */}
                                <Select
                                    value={String(viewMonth)}
                                    onValueChange={(val) => setViewMonth(Number(val))}
                                >
                                    <SelectTrigger className="h-7 w-fit gap-1 border-0 shadow-none bg-transparent font-semibold text-sm hover:bg-accent/50 focus:ring-0 pr-1 [&>svg]:size-3">
                                        <SelectValue>{MONTHS_VI[viewMonth]}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {MONTHS_VI.map((month, idx) => (
                                            <SelectItem key={idx} value={String(idx)}>
                                                {month}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Year select */}
                                <Select
                                    value={String(viewYear)}
                                    onValueChange={(val) => setViewYear(Number(val))}
                                >
                                    <SelectTrigger className="h-7 w-fit gap-1 border-0 shadow-none bg-transparent font-semibold text-sm hover:bg-accent/50 focus:ring-0 pr-1 [&>svg]:size-3">
                                        <SelectValue>{viewYear}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        <ScrollArea className="h-60">
                                            {years.map((year) => (
                                                <SelectItem key={year} value={String(year)}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </ScrollArea>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToPrevMonth}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToNextMonth}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {WEEKDAYS_VI.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-xs font-medium text-muted-foreground py-1"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7">
                            {calendarDays.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => item.isCurrentMonth && handleSelectDay(item.day)}
                                    disabled={!item.isCurrentMonth}
                                    className={cn(
                                        "h-8 w-full text-sm rounded-md transition-colors",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "focus:outline-none focus:ring-1 focus:ring-ring",
                                        !item.isCurrentMonth && "text-muted-foreground/40 pointer-events-none",
                                        item.isCurrentMonth && isToday(item.day) && !isSelected(item.day) &&
                                        "bg-accent text-accent-foreground font-medium",
                                        item.isCurrentMonth && isSelected(item.day) &&
                                        "bg-primary text-primary-foreground font-medium",
                                    )}
                                >
                                    {item.day}
                                </button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
