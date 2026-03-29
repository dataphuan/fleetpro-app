import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date
    onChange?: (date: Date | undefined) => void
    disabled?: boolean
    className?: string
    placeholder?: string
}

export function DatePicker({ value, onChange, disabled, className, placeholder = "dd/MM/yyyy" }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    // Sync input value when prop value changes
    React.useEffect(() => {
        if (value) {
            setInputValue(format(value, "dd/MM/yyyy"))
        } else {
            setInputValue("")
        }
    }, [value])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)

        // Allow flexible formats: "1/1/2026", "01/01/2026", "2026-01-01"
        // Minimal length for a possibly valid date is 8 chars e.g. "1/1/2026" or "2026-1-1"
        if (newValue.length >= 8) {
            // Try parsing multiple formats
            const formats = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "d-M-yyyy", "dd-MM-yyyy"]
            let parsedDate: Date | undefined

            for (const fmt of formats) {
                const d = parse(newValue, fmt, new Date())
                if (isValid(d)) {
                    parsedDate = d
                    break
                }
            }

            if (parsedDate) {
                // Check if year is reasonable (e.g., > 1900) to avoid '202' -> 0202
                if (parsedDate.getFullYear() > 1900) {
                    onChange?.(parsedDate)
                }
            }
        } else if (newValue === "") {
            onChange?.(undefined)
        }
    }

    const handleInputBlur = () => {
        // If current input is not empty, try to normalize it to "dd/MM/yyyy"
        // If it's effectively the same date as 'value', ensure display is normalized
        if (inputValue.trim() === "") {
            if (value) onChange?.(undefined) // Use undefined to clear if user cleared it
            setInputValue("")
            return;
        }

        const formats = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "d-M-yyyy", "dd-MM-yyyy"]
        let parsedDate: Date | undefined

        for (const fmt of formats) {
            const d = parse(inputValue, fmt, new Date())
            if (isValid(d) && d.getFullYear() > 1900) {
                parsedDate = d
                break
            }
        }

        if (parsedDate) {
            // Valid manual input -> Update parent and normalize display
            onChange?.(parsedDate)
            setInputValue(format(parsedDate, "dd/MM/yyyy"))
        } else {
            // Invalid manual input -> Revert to previous valid value or clear
            if (value) {
                setInputValue(format(value, "dd/MM/yyyy"))
            } else {
                setInputValue("")
            }
        }
    }

    const handleIconClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setOpen((prev) => !prev)
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <div className={cn("relative w-full", className)}>
                <Input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full pr-10" // Add padding for icon
                />
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={handleIconClick}
                        disabled={disabled}
                        tabIndex={-1} // Prevent tab focus, rely on visual click or input interaction
                    >
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                </PopoverTrigger>
            </div>

            <PopoverContent
                className="w-auto p-0"
                align="end"
                onOpenAutoFocus={(e) => e.preventDefault()} // Prevent stealing focus from input
            >
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={(date) => {
                        onChange?.(date)
                        setOpen(false)
                        // Update input immediately on selection
                        if (date) {
                            setInputValue(format(date, "dd/MM/yyyy"))
                        }
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
