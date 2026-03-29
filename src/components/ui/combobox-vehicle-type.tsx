"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// Default vehicle types
const DEFAULT_VEHICLE_TYPES = [
    "Xe thùng",
    "Xe cẩu",
    "Romooc",
    "Xe đầu kéo",
    "Xe ben",
    "Xe cont",
    "Xe tải nhẹ",
    "Xe tải nặng",
    "Xe bồn",
    "Xe lạnh",
];

const STORAGE_KEY = "vehicle_types_custom";

// Get custom types from localStorage
function getCustomTypes(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Save custom type to localStorage
function saveCustomType(type: string) {
    if (typeof window === "undefined") return;
    const customs = getCustomTypes();
    if (!customs.includes(type) && !DEFAULT_VEHICLE_TYPES.includes(type)) {
        customs.push(type);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
    }
}

interface ComboboxVehicleTypeProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ComboboxVehicleType({
    value = "",
    onChange,
    placeholder = "Chọn hoặc nhập loại xe",
    disabled = false,
}: ComboboxVehicleTypeProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value);
    const [customTypes, setCustomTypes] = React.useState<string[]>([]);

    // Load custom types on mount
    React.useEffect(() => {
        setCustomTypes(getCustomTypes());
    }, []);

    // Sync input with value prop
    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    // All available types (default + custom, deduplicated)
    const allTypes = React.useMemo(() => {
        const combined = [...DEFAULT_VEHICLE_TYPES, ...customTypes];
        return [...new Set(combined)].sort((a, b) => a.localeCompare(b, "vi"));
    }, [customTypes]);

    // Filtered types based on input
    const filteredTypes = React.useMemo(() => {
        if (!inputValue.trim()) return allTypes;
        const query = inputValue.toLowerCase();
        return allTypes.filter((type) => type.toLowerCase().includes(query));
    }, [allTypes, inputValue]);

    // Check if current input is a new type
    const isNewType = inputValue.trim() && !allTypes.some(
        (t) => t.toLowerCase() === inputValue.trim().toLowerCase()
    );

    const handleSelect = (type: string) => {
        setInputValue(type);
        onChange(type);
        setOpen(false);
    };

    const handleAddNew = () => {
        const trimmed = inputValue.trim();
        if (trimmed) {
            saveCustomType(trimmed);
            setCustomTypes([...customTypes, trimmed]);
            onChange(trimmed);
            setOpen(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        // Also update parent immediately for free-text
        onChange(newValue);
    };

    const handleInputBlur = () => {
        // Save custom type when user leaves the field
        const trimmed = inputValue.trim();
        if (trimmed && isNewType) {
            saveCustomType(trimmed);
            setCustomTypes(getCustomTypes());
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    <span className={cn(!value && "text-muted-foreground")}>
                        {value || placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        placeholder="Tìm hoặc nhập loại xe mới..."
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        className="h-9"
                        autoFocus
                    />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                    {filteredTypes.length === 0 && !isNewType && (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                            Không tìm thấy loại xe
                        </div>
                    )}
                    {filteredTypes.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleSelect(type)}
                            className={cn(
                                "relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                value === type && "bg-accent"
                            )}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    value === type ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {type}
                            {customTypes.includes(type) && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                    (tùy chỉnh)
                                </span>
                            )}
                        </button>
                    ))}
                    {isNewType && (
                        <button
                            type="button"
                            onClick={handleAddNew}
                            className="relative flex w-full cursor-pointer select-none items-center px-3 py-2 text-sm outline-none bg-primary/5 hover:bg-primary/10 text-primary border-t"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm: "{inputValue.trim()}"
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
