import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, Search, ChevronDown, AlertTriangle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
    value: string;
    label: string;
    count: number;
}

interface FilterConfig {
    key: string;
    label: string;
    type: 'multi-select' | 'expiry-days' | 'salary-range';
    options?: FilterOption[];
    expiryField?: string;
}

interface DriverFilterProps {
    data: Record<string, unknown>[];
    filterConfigs: FilterConfig[];
    activeFilters: Record<string, string[] | number | { min: number; max: number } | boolean>;
    onFilterChange: (filters: Record<string, string[] | number | { min: number; max: number } | boolean>) => void;
}

const STORAGE_KEY = 'drivers_filters';

export function DriverFilter({ data, filterConfigs, activeFilters, onFilterChange }: DriverFilterProps) {
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                onFilterChange(parsed);
            } catch {
                // Use defaults
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeFilters));
    }, [activeFilters]);

    const filterOptions = useMemo(() => {
        const options: Record<string, FilterOption[]> = {};

        filterConfigs.forEach(config => {
            if (config.type === 'multi-select') {
                const values = new Map<string, number>();
                data.forEach(row => {
                    const val = String(row[config.key] || '');
                    if (val) {
                        values.set(val, (values.get(val) || 0) + 1);
                    }
                });
                options[config.key] = Array.from(values.entries())
                    .map(([value, count]) => ({ value, label: value, count }))
                    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
            }
        });

        return options;
    }, [data, filterConfigs]);

    const handleMultiSelectChange = (key: string, value: string, checked: boolean) => {
        const current = (activeFilters[key] as string[]) || [];
        let newValues: string[];
        if (checked) {
            newValues = [...current, value];
        } else {
            newValues = current.filter(v => v !== value);
        }
        onFilterChange({ ...activeFilters, [key]: newValues });
    };

    const handleExpiryDaysChange = (key: string, days: number | null) => {
        if (days === null) {
            const { [key]: _, ...rest } = activeFilters;
            onFilterChange(rest);
        } else {
            onFilterChange({ ...activeFilters, [key]: days });
        }
    };

    const handleSalaryRangeChange = (key: string, range: { min: number; max: number } | null) => {
        if (range === null) {
            const { [key]: _, ...rest } = activeFilters;
            onFilterChange(rest);
        } else {
            onFilterChange({ ...activeFilters, [key]: range });
        }
    };

    const handleClearFilter = (key: string) => {
        const { [key]: _, ...rest } = activeFilters;
        onFilterChange(rest);
    };

    const handleClearAll = () => {
        onFilterChange({});
    };

    const activeFilterCount = Object.keys(activeFilters).filter(k => {
        const v = activeFilters[k];
        return Array.isArray(v) ? v.length > 0 : v !== undefined;
    }).length;

    return (
        <div className="flex flex-wrap items-center gap-2 py-2">
            {filterConfigs.map(config => {
                const activeValues = (activeFilters[config.key] as string[]) || [];
                const isActive = config.type === 'multi-select'
                    ? activeValues.length > 0
                    : activeFilters[config.key] !== undefined;

                return (
                    <FilterChip
                        key={config.key}
                        config={config}
                        options={filterOptions[config.key] || []}
                        activeValues={activeValues}
                        isActive={isActive}
                        searchQuery={searchQueries[config.key] || ''}
                        onSearchChange={(q) => setSearchQueries(prev => ({ ...prev, [config.key]: q }))}
                        onMultiSelectChange={(value, checked) => handleMultiSelectChange(config.key, value, checked)}
                        onExpiryDaysChange={(days) => handleExpiryDaysChange(config.key, days)}
                        onSalaryRangeChange={(range) => handleSalaryRangeChange(config.key, range)}
                        expiryDays={typeof activeFilters[config.key] === 'number' ? activeFilters[config.key] as number : undefined}
                        salaryRange={(activeFilters[config.key] as { min: number; max: number }) || undefined}
                        onClear={() => handleClearFilter(config.key)}
                    />
                );
            })}

            {activeFilterCount > 0 && (
                <>
                    <div className="h-4 w-px bg-border" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={handleClearAll}
                    >
                        <X className="w-3 h-3 mr-1" />
                        Xóa lọc
                    </Button>
                </>
            )}
        </div>
    );
}

interface FilterChipProps {
    config: FilterConfig;
    options: FilterOption[];
    activeValues: string[];
    isActive: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onMultiSelectChange: (value: string, checked: boolean) => void;
    onExpiryDaysChange: (days: number | null) => void;
    onSalaryRangeChange: (range: { min: number; max: number } | null) => void;
    expiryDays?: number;
    salaryRange?: { min: number; max: number };
    onClear: () => void;
}

function FilterChip({
    config,
    options,
    activeValues,
    isActive,
    searchQuery,
    onSearchChange,
    onMultiSelectChange,
    onExpiryDaysChange,
    onSalaryRangeChange,
    expiryDays,
    salaryRange,
    onClear,
}: FilterChipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localRange, setLocalRange] = useState({ min: salaryRange?.min || 0, max: salaryRange?.max || 50000000 });

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectAll = () => {
        options.forEach(opt => onMultiSelectChange(opt.value, true));
    };

    const handleDeselectAll = () => {
        options.forEach(opt => onMultiSelectChange(opt.value, false));
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-7 px-2.5 gap-1.5 text-xs font-normal',
                        isActive && 'bg-primary/10 border-primary/30 text-primary'
                    )}
                >
                    {config.type === 'expiry-days' && <AlertTriangle className="w-3 h-3" />}
                    {config.type === 'salary-range' && <DollarSign className="w-3 h-3" />}
                    {config.label}
                    {isActive && config.type === 'multi-select' && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            {activeValues.length}
                        </Badge>
                    )}
                    {isActive && config.type === 'expiry-days' && expiryDays && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            {expiryDays}d
                        </Badge>
                    )}
                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                {config.type === 'multi-select' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Tìm..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="h-7 pl-7 text-xs"
                            />
                        </div>

                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs flex-1" onClick={handleSelectAll}>
                                Chọn tất cả
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs flex-1" onClick={handleDeselectAll}>
                                Bỏ chọn
                            </Button>
                        </div>

                        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                            {filteredOptions.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">Không tìm thấy</p>
                            ) : (
                                filteredOptions.map(opt => (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={activeValues.includes(opt.value)}
                                            onCheckedChange={(checked) => onMultiSelectChange(opt.value, checked as boolean)}
                                        />
                                        <span className="text-xs truncate flex-1">{opt.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{opt.count}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {config.type === 'expiry-days' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={expiryDays !== undefined}
                                onCheckedChange={(checked) => onExpiryDaysChange(checked ? 30 : null)}
                            />
                            <Label className="text-xs">Lọc hết hạn trong</Label>
                        </div>
                        {expiryDays !== undefined && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={expiryDays}
                                    onChange={(e) => onExpiryDaysChange(parseInt(e.target.value) || 30)}
                                    className="h-7 w-16 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">ngày tới</span>
                            </div>
                        )}
                    </div>
                )}

                {config.type === 'salary-range' && (
                    <div className="space-y-3">
                        <Label className="text-xs">Khoảng lương (VND)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="Min"
                                value={localRange.min}
                                onChange={(e) => setLocalRange(prev => ({ ...prev, min: parseInt(e.target.value) || 0 }))}
                                className="h-7 text-xs"
                            />
                            <span className="text-xs">-</span>
                            <Input
                                type="number"
                                placeholder="Max"
                                value={localRange.max}
                                onChange={(e) => setLocalRange(prev => ({ ...prev, max: parseInt(e.target.value) || 0 }))}
                                className="h-7 text-xs"
                            />
                        </div>
                        <Button
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => onSalaryRangeChange(localRange)}
                        >
                            Áp dụng
                        </Button>
                    </div>
                )}

                {isActive && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 mt-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                            onClear();
                            setIsOpen(false);
                        }}
                    >
                        <X className="w-3 h-3 mr-1" />
                        Xóa lọc này
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
}
