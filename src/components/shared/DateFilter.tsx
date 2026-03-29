import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, subDays, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters, startOfYear, endOfYear, subYears } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

export type DatePreset =
    | 'today' | 'yesterday'
    | 'this_week' | 'last_week' | 'last_7_days'
    | 'this_month' | 'last_month' | 'last_30_days'
    | 'this_quarter' | 'last_quarter'
    | 'this_year' | 'last_year'
    | 'custom';

interface DateFilterProps {
    preset?: string;
    range?: DateRange;
    onChange: (range: DateRange | undefined, preset: string) => void;
    className?: string;
}

export function DateFilter({ preset: controlledPreset, range: controlledRange, onChange, className }: DateFilterProps) {
    const [preset, setPreset] = useState<string>(controlledPreset || 'this_year');
    const [customRange, setCustomRange] = useState<DateRange | undefined>(controlledRange);

    // Sync with controlled props if provided
    useEffect(() => {
        if (controlledPreset) setPreset(controlledPreset);
    }, [controlledPreset]);

    useEffect(() => {
        if (controlledRange) setCustomRange(controlledRange);
    }, [controlledRange]);

    const handlePresetChange = (value: string) => {
        setPreset(value);

        const now = new Date();
        let start = startOfMonth(now);
        let end = endOfMonth(now);

        switch (value) {
            case "today":
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case "yesterday":
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case "this_week":
                start = startOfWeek(now, { locale: vi });
                end = endOfWeek(now, { locale: vi });
                break;
            case "last_week":
                start = startOfWeek(subWeeks(now, 1), { locale: vi });
                end = endOfWeek(subWeeks(now, 1), { locale: vi });
                break;
            case "last_7_days":
                start = subDays(now, 7);
                end = now;
                break;
            case "this_month":
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case "last_month":
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case "last_30_days":
                start = subDays(now, 30);
                end = now;
                break;
            case "this_quarter":
                start = startOfQuarter(now);
                end = endOfQuarter(now);
                break;
            case "last_quarter":
                start = startOfQuarter(subQuarters(now, 1));
                end = endOfQuarter(subQuarters(now, 1));
                break;
            case "this_year":
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case "last_year":
                start = startOfYear(subYears(now, 1));
                end = endOfYear(subYears(now, 1));
                break;
            case "custom":
                // Keep existing custom range or reset?
                // Don't call onChange yet, wait for picker
                return;
        }

        const newRange = { from: start, to: end };
        setCustomRange(newRange);
        onChange(newRange, value);
    };

    const handleCustomDateChange = (range: DateRange | undefined) => {
        setCustomRange(range);
        onChange(range, 'custom');
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-sm text-muted-foreground flex items-center gap-1 min-w-fit">
                <Calendar className="w-4 h-4" />
                Thời gian:
            </span>
            <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-[180px] h-9 bg-background">
                    <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="today">Hôm nay</SelectItem>
                    <SelectItem value="yesterday">Hôm qua</SelectItem>
                    <SelectItem value="this_week">Tuần này</SelectItem>
                    <SelectItem value="last_week">Tuần trước</SelectItem>
                    <SelectItem value="last_7_days">7 ngày qua</SelectItem>
                    <SelectItem value="this_month">Tháng này</SelectItem>
                    <SelectItem value="last_month">Tháng trước</SelectItem>
                    <SelectItem value="last_30_days">30 ngày qua</SelectItem>
                    <SelectItem value="this_quarter">Quý này</SelectItem>
                    <SelectItem value="last_quarter">Quý trước</SelectItem>
                    <SelectItem value="this_year">Năm nay</SelectItem>
                    <SelectItem value="last_year">Năm trước</SelectItem>
                    <SelectItem value="custom">Tùy chọn...</SelectItem>
                </SelectContent>
            </Select>

            {preset === 'custom' && (
                <DateRangePicker
                    date={customRange}
                    onSelect={handleCustomDateChange}
                    className="w-[260px]"
                />
            )}
        </div>
    );
}
