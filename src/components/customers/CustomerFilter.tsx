import { useState, useEffect, useMemo } from 'react';
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
import { formatCurrency } from '@/lib/formatters';

interface FilterOption {
    value: string;
    label: string;
    count: number;
}

interface FilterConfig {
    key: string;
    label: string;
    type: 'multi-select' | 'numeric-min' | 'boolean';
    options?: FilterOption[]; // For multi-select
}

interface CustomerFilterProps {
    data: Record<string, unknown>[];
    filterConfigs: FilterConfig[];
    activeFilters: Record<string, unknown>;
    onFilterChange: (filters: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'customers_filters';

export function CustomerFilter({ data, filterConfigs, activeFilters, onFilterChange }: CustomerFilterProps) {
    const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

    // Load from localStorage on mount
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

    // Save to localStorage when filters change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeFilters));
    }, [activeFilters]);

    // Get unique values for multi-select filters
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

    const handleNumericMinChange = (key: string, value: number | null) => {
        if (value === null) {
            const { [key]: _, ...rest } = activeFilters;
            onFilterChange(rest);
        } else {
            onFilterChange({ ...activeFilters, [key]: value });
        }
    };

    const handleBooleanChange = (key: string, value: boolean | null) => {
        if (value === null) {
            const { [key]: _, ...rest } = activeFilters;
            onFilterChange(rest);
        } else {
            onFilterChange({ ...activeFilters, [key]: value });
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
        return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null;
    }).length;

    const filteredDataCount = useMemo(() => {
        return data.filter(row => {
            for (const key of Object.keys(activeFilters)) {
                const filterValue = activeFilters[key];
                const config = filterConfigs.find(c => c.key === key);

                if (!config || filterValue === undefined || filterValue === null) continue;

                const rowValue = row[key];

                if (config.type === 'multi-select' && Array.isArray(filterValue)) {
                    if (filterValue.length > 0) {
                        if (!filterValue.includes(String(rowValue || ''))) return false;
                    }
                } else if (config.type === 'numeric-min' && typeof filterValue === 'number') {
                    if (Number(rowValue || 0) < filterValue) return false;
                } else if (config.type === 'boolean' && typeof filterValue === 'boolean') {
                    // Logic for specific boolean flags
                    if (key === 'overdue' && filterValue === true) {
                        // Custom logic for overdue: debt > 0 and ... wait, row[key] might not exist if it's computed?
                        // Assuming the row has a computed flag or we check logic here.
                        // For simplicity, let's assume the passed data has these fields or we use a custom check logic.
                        // But here we are filtering generic 'data'.
                        // Let's assume the Row data has been pre-computed with these boolean flags or exact matches.
                        if (rowValue !== true) return false;
                    } else if (key === 'has_limit') {
                        const limit = Number(row['credit_limit'] || 0);
                        if (filterValue === true && limit <= 0) return false;
                        if (filterValue === false && limit > 0) return false;
                    } else {
                        if (Boolean(rowValue) !== filterValue) return false;
                    }
                }
            }
            return true;
        }).length;
    }, [data, activeFilters, filterConfigs]);

    return (
        <div className="flex flex-wrap items-center gap-2 py-2">
            {/* Filter chips */}
            {filterConfigs.map(config => {
                const isActive = activeFilters[config.key] !== undefined && activeFilters[config.key] !== null &&
                    (Array.isArray(activeFilters[config.key]) ? (activeFilters[config.key] as any[]).length > 0 : true);

                return (
                    <FilterChip
                        key={config.key}
                        config={config}
                        options={filterOptions[config.key] || []}
                        activeValue={activeFilters[config.key]}
                        isActive={isActive}
                        searchQuery={searchQueries[config.key] || ''}
                        onSearchChange={(q) => setSearchQueries(prev => ({ ...prev, [config.key]: q }))}
                        onMultiSelectChange={(value, checked) => handleMultiSelectChange(config.key, value, checked)}
                        onNumericMinChange={(val) => handleNumericMinChange(config.key, val)}
                        onBooleanChange={(val) => handleBooleanChange(config.key, val)}
                        onClear={() => handleClearFilter(config.key)}
                    />
                );
            })}

            {/* Clear all */}
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
                    <div className="h-4 w-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                        {filteredDataCount} / {data.length} khách hàng
                    </span>
                </>
            )}
        </div>
    );
}

// Individual filter chip
interface FilterChipProps {
    config: FilterConfig;
    options: FilterOption[];
    activeValue: any;
    isActive: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onMultiSelectChange: (value: string, checked: boolean) => void;
    onNumericMinChange: (value: number | null) => void;
    onBooleanChange: (value: boolean | null) => void;
    onClear: () => void;
}

function FilterChip({
    config,
    options,
    activeValue,
    isActive,
    searchQuery,
    onSearchChange,
    onMultiSelectChange,
    onNumericMinChange,
    onBooleanChange,
    onClear,
}: FilterChipProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Multi-select helpers
    const activeValues = Array.isArray(activeValue) ? activeValue : [];
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const handleSelectAll = () => options.forEach(opt => onMultiSelectChange(opt.value, true));
    const handleDeselectAll = () => options.forEach(opt => onMultiSelectChange(opt.value, false));

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-7 px-2.5 gap-1.5 text-xs font-normal border-dashed',
                        isActive && 'bg-primary/10 border-primary/30 text-primary border-solid'
                    )}
                >
                    {config.type === 'numeric-min' && <DollarSign className="w-3 h-3" />}
                    {config.type === 'boolean' && <AlertTriangle className="w-3 h-3" />}
                    {config.label}

                    {isActive && config.type === 'multi-select' && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            {activeValues.length}
                        </Badge>
                    )}

                    {isActive && config.type === 'numeric-min' && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            &gt; {formatCurrency(activeValue)}
                        </Badge>
                    )}

                    {isActive && config.type === 'boolean' && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                            {activeValue ? 'Có' : 'Không'}
                        </Badge>
                    )}

                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">

                {/* MULTI SELECT UI */}
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
                                    <label key={opt.value} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer">
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

                {/* NUMERIC MIN UI */}
                {config.type === 'numeric-min' && (
                    <div className="space-y-3 p-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Lớn hơn số tiền:</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={activeValue || ''}
                                onChange={(e) => onNumericMinChange(e.target.value ? Number(e.target.value) : null)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                )}

                {/* BOOLEAN UI */}
                {config.type === 'boolean' && (
                    <div className="space-y-3 p-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs cursor-pointer" onClick={() => onBooleanChange(!activeValue)}>
                                {config.label} ?
                            </Label>
                            <Switch
                                checked={!!activeValue}
                                onCheckedChange={(checked) => onBooleanChange(checked)}
                            />
                        </div>
                    </div>
                )}

                {/* Clear Button */}
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
                        Xóa điều kiện này
                    </Button>
                )}
            </PopoverContent>
        </Popover>
    );
}
