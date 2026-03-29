import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Columns3 } from 'lucide-react';

interface ColumnChooserProps {
    columns: Array<{ key: string; header: string }>;
    visibleColumns: string[];
    onVisibilityChange: (columns: string[]) => void;
    storageKey: string; // Made required to prevent conflicts
    defaultRequiredKeys?: string[]; // Keys that cannot be hidden
}

export function ColumnChooser({
    columns,
    visibleColumns,
    onVisibilityChange,
    storageKey,
    defaultRequiredKeys = ['id']
}: ColumnChooserProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        if (!storageKey) return;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    // Ensure required keys are always present even if local storage is old
                    const merged = Array.from(new Set([...parsed, ...defaultRequiredKeys]));
                    onVisibilityChange(merged);
                }
            } catch {
                // Use defaults
            }
        }
    }, [storageKey, defaultRequiredKeys, onVisibilityChange]);

    const handleToggle = (key: string, checked: boolean) => {
        let newVisible: string[];
        if (checked) {
            newVisible = [...visibleColumns, key];
        } else {
            // Don't allow hiding required columns
            if (defaultRequiredKeys.includes(key)) return;
            newVisible = visibleColumns.filter(k => k !== key);
        }
        onVisibilityChange(newVisible);
        localStorage.setItem(storageKey, JSON.stringify(newVisible));
    };

    const handleSelectAll = () => {
        const allKeys = columns.map(c => c.key);
        onVisibilityChange(allKeys);
        localStorage.setItem(storageKey, JSON.stringify(allKeys));
    };

    const handleDeselectAll = () => {
        // Keep required columns
        onVisibilityChange(defaultRequiredKeys);
        localStorage.setItem(storageKey, JSON.stringify(defaultRequiredKeys));
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Columns3 className="w-4 h-4" />
                    Cột hiển thị
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Ẩn/Hiện cột</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleSelectAll}>
                                Tất cả
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleDeselectAll}>
                                Tối thiểu
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                        {columns
                            .filter(col => col.header) // Skip action column
                            .map(col => (
                                <label
                                    key={col.key}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                                >
                                    <Checkbox
                                        checked={visibleColumns.includes(col.key)}
                                        onCheckedChange={(checked) => handleToggle(col.key, checked as boolean)}
                                        disabled={defaultRequiredKeys.includes(col.key)}
                                    />
                                    <span className="text-sm truncate">{col.header}</span>
                                    {defaultRequiredKeys.includes(col.key) && (
                                        <span className="text-[10px] text-muted-foreground ml-auto">Bắt buộc</span>
                                    )}
                                </label>
                            ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
