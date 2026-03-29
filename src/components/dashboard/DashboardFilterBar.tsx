import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, Filter, Search, X, Download } from "lucide-react";
import { useState } from "react";

interface DashboardFilterBarProps {
    onSearchChange: (value: string) => void;
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    onFilterChange?: (type: string, value: string) => void;
    onClearFilters?: () => void;
    onExport?: () => void;
    placeholder?: string;
    showStatusFilter?: boolean;
    statusOptions?: { value: string; label: string }[];
    defaultDateRange?: 'today' | 'week' | 'month' | 'quarter';
}

const DATE_PRESETS = [
    { label: 'Hôm nay', getValue: () => ({ from: new Date(), to: new Date() }) },
    { label: 'Tuần này', getValue: () => ({ from: startOfWeek(new Date(), { locale: vi }), to: endOfWeek(new Date(), { locale: vi }) }) },
    { label: 'Tháng này', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: 'Quý này', getValue: () => ({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
];

export function DashboardFilterBar({
    onSearchChange,
    onDateRangeChange,
    onFilterChange,
    onClearFilters,
    onExport,
    placeholder = "Tìm kiếm...",
    showStatusFilter = false,
    statusOptions = [],
    defaultDateRange = 'month'
}: DashboardFilterBarProps) {
    const [date, setDate] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [activePreset, setActivePreset] = useState<string>(defaultDateRange);
    const [searchValue, setSearchValue] = useState("");

    const handlePresetClick = (preset: typeof DATE_PRESETS[0], label: string) => {
        const range = preset.getValue();
        setDate({ from: range.from, to: range.to });
        setActivePreset(label);
        onDateRangeChange({ from: range.from, to: range.to });
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
        onSearchChange(value);
    };

    const handleClear = () => {
        setSearchValue("");
        onSearchChange("");

        // Reset to default month
        const defaultRange = DATE_PRESETS.find(p => p.label === 'Tháng này')?.getValue();
        if (defaultRange) {
            setDate({ from: defaultRange.from, to: defaultRange.to });
            setActivePreset('Tháng này');
            onDateRangeChange({ from: defaultRange.from, to: defaultRange.to });
        }

        if (onClearFilters) onClearFilters();
    };

    return (
        <div className="flex flex-col gap-2 mb-3">
            <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center bg-card p-2 rounded-lg border shadow-sm">

                {/* Left Side: Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={placeholder}
                            className="pl-8"
                            value={searchValue}
                            onChange={handleSearch}
                        />
                        {searchValue && (
                            <button
                                onClick={() => {
                                    setSearchValue("");
                                    onSearchChange("");
                                }}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Date Presets */}
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md overflow-x-auto max-w-full">
                        {DATE_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset, preset.label)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-sm transition-all whitespace-nowrap",
                                    activePreset === preset.label
                                        ? "bg-white text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Optional Status Filter */}
                    {showStatusFilter && onFilterChange && (
                        <Select onValueChange={(val) => onFilterChange('status', val)}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                {statusOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn(
                                "justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "dd/MM/yyyy")} - {format(date.to, "dd/MM/yyyy")}
                                        </>
                                    ) : (
                                        format(date.from, "dd/MM/yyyy")
                                    )
                                ) : (
                                    <span>Chọn ngày</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={(range) => {
                                    setDate({ from: range?.from, to: range?.to });
                                    if (range?.from && range?.to) {
                                        setActivePreset('custom');
                                        onDateRangeChange({ from: range.from, to: range.to });
                                    }
                                }}
                                numberOfMonths={2}
                                locale={vi}
                            />
                        </PopoverContent>
                    </Popover>

                    {onExport && (
                        <Button variant="outline" size="icon" onClick={onExport} title="Xuất Excel">
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters Summary (Optional - can be expanded later) */}
            {activePreset === 'custom' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                    <Filter className="w-3 h-3" />
                    <span>Đang lọc theo thời gian tùy chỉnh</span>
                    <button
                        onClick={handleClear}
                        className="text-primary hover:underline text-xs ml-2"
                    >
                        Đặt lại mặc định
                    </button>
                </div>
            )}
        </div>
    );
}
