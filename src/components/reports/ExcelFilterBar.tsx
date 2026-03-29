import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, RefreshCw, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { DateFilter } from "@/components/shared/DateFilter";

export interface FilterState {
  searchPromise: string;
  dateRange: DateRange | undefined;
  status: string[];
  vehicleIds: string[];
  driverIds: string[];
  vehicleType?: string;
  revenueRange?: string;
  customerId?: string;
}

interface ExcelFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh?: () => void;
  // Data for filter options
  vehicleTypes?: string[];
  customers?: { id: string; name: string }[];
  showVehicleTypeFilter?: boolean;
  showRevenueFilter?: boolean;
  showCustomerFilter?: boolean;
  children?: React.ReactNode;
}

const REVENUE_RANGES = [
  { value: "all", label: "Doanh thu" },
  { value: "0-10m", label: "0 - 10 triệu" },
  { value: "10-30m", label: "10 - 30 triệu" },
  { value: "30-50m", label: "30 - 50 triệu" },
  { value: "50m+", label: "Trên 50 triệu" },
];

export function ExcelFilterBar({
  filters,
  onFilterChange,
  onRefresh,
  vehicleTypes = [],
  customers = [],
  showVehicleTypeFilter = false,
  showRevenueFilter = false,
  showCustomerFilter = false,
  children,
}: ExcelFilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.searchPromise || "");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onFilterChange({ ...filters, searchPromise: e.target.value });
  };

  const handleVehicleTypeChange = (value: string) => {
    onFilterChange({ ...filters, vehicleType: value === "all" ? undefined : value });
  };

  const handleRevenueRangeChange = (value: string) => {
    onFilterChange({ ...filters, revenueRange: value === "all" ? undefined : value });
  };

  const handleCustomerChange = (value: string) => {
    onFilterChange({ ...filters, customerId: value === "all" ? undefined : value });
  };

  const hasActiveFilters = filters.vehicleType || filters.revenueRange || filters.customerId || filters.searchPromise;

  const clearAllFilters = () => {
    setSearchValue("");
    onFilterChange({
      ...filters,
      searchPromise: "",
      vehicleType: undefined,
      revenueRange: undefined,
      customerId: undefined,
    });
  };

  // Count active filters
  const activeFilterCount = [
    filters.vehicleType,
    filters.revenueRange,
    filters.customerId,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Main Filter Row - Similar to Vehicles tab */}
      <div className="flex flex-wrap items-center gap-2 py-2">
        {/* Search Input - First */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm mã xe, biển số..."
            value={searchValue}
            onChange={handleSearchChange}
            className="pl-9 h-9 w-[180px] bg-background"
          />
          {searchValue && (
            <X
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={() => {
                setSearchValue("");
                onFilterChange({ ...filters, searchPromise: "" });
              }}
            />
          )}
        </div>

        {/* Date Filter */}
        <DateFilter
          range={filters.dateRange}
          onChange={(range, preset) => onFilterChange({ ...filters, dateRange: range })}
          className="w-auto"
        />

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Vehicle Type Filter */}
        {showVehicleTypeFilter && (
          <Select
            value={filters.vehicleType || "all"}
            onValueChange={handleVehicleTypeChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[100px] gap-1 border-dashed">
              <span className="text-sm">Loại xe</span>
              {filters.vehicleType && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                  1
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại xe</SelectItem>
              {vehicleTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Revenue Range Filter */}
        {showRevenueFilter && (
          <Select
            value={filters.revenueRange || "all"}
            onValueChange={handleRevenueRangeChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[100px] gap-1 border-dashed">
              <span className="text-sm">Doanh thu</span>
              {filters.revenueRange && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                  1
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              {REVENUE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Customer Filter */}
        {showCustomerFilter && customers.length > 0 && (
          <Select
            value={filters.customerId || "all"}
            onValueChange={handleCustomerChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[110px] gap-1 border-dashed">
              <span className="text-sm">Khách hàng</span>
              {filters.customerId && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-normal">
                  1
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả KH</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear filters button - only show when filters active */}
        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Xóa bộ lọc
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            className="h-9 w-9"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}

        {/* Extra Actions */}
        {children}
      </div>
    </div>
  );
}
