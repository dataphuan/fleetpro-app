import { ReactNode, useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Download,
  Upload,
  Plus,
  Filter,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckSquare,
  Square,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  onExport?: () => void;
  onImport?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyMessage?: string;
  onDeleteSelected?: (ids: string[]) => void;
  selectedRowIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  hideToolbar?: boolean;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  selectable = false,
  searchPlaceholder = "Tìm kiếm...",
  onSearch,
  onAdd,
  addLabel = "Thêm mới",
  onExport,
  onImport,
  onSync,
  isSyncing = false,
  onRowClick,
  pageSize: defaultPageSize = 20,
  emptyMessage = "Không có dữ liệu",
  onDeleteSelected,
  selectedRowIds,
  onSelectionChange,
  hideToolbar = false,
}: DataTableProps<T>) {
  const [internalSelectedRows, setInternalSelectedRows] = useState<Set<string>>(new Set());
  const selectedRows = selectedRowIds || internalSelectedRows;

  const setSelectedRows = (newSelected: Set<string>) => {
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    } else {
      setInternalSelectedRows(newSelected);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Reset selection when data changes (optional, but safer for consistency)
  useEffect(() => {
    // We don't reset selectedRows automatically to allow selection persistence across search/filter if desired.
    // However, if items disappear from data, we might want to clean up. For now, keep as is for "Select All Filtered" logic.
  }, [data]);

  // Reset page if data length changes (e.g. filtering) to avoid staying on empty page
  // Use a simple check: if current page is beyond total pages, go to last page or first page.
  // Usually for filtering, we want to go to page 1.
  useEffect(() => {
    if (currentPage > Math.ceil(data.length / pageSize) && data.length > 0) {
      setCurrentPage(1);
    } else if (data.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
    // Also optional: Always reset to 1 when data reference changes? 
    // That might be annoying if polling updates data. 
    // But for "Client-side filtering results", new array = reset.
  }, [data, pageSize]);

  const getValue = (row: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: any = row;
      for (const k of keys) {
        value = value?.[k];
      }
      return value;
    }
    return row[key as keyof T];
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue), 'vi', { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedData.length);
  const currentData = sortedData.slice(startIndex, endIndex);

  // Handle "Select All" in header (Current Page)
  const handleSelectPage = (checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      currentData.forEach(row => newSelected.add(row.id));
    } else {
      currentData.forEach(row => newSelected.delete(row.id));
    }
    setSelectedRows(newSelected);
  };

  // Handle "Select All Filtered" (All Pages)
  const handleSelectAllFiltered = () => {
    const newSelected = new Set(selectedRows);
    sortedData.forEach(row => newSelected.add(row.id));
    setSelectedRows(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedRows(new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    onSearch?.(value);
  };

  const isAllPageSelected = currentData.length > 0 && currentData.every((row) => selectedRows.has(row.id));
  const isIndeterminate = currentData.some((row) => selectedRows.has(row.id)) && !isAllPageSelected;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!hideToolbar && (
        <div className="flex flex-col gap-4">
          {/* Top Actions Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Bulk Selection Info & Actions (Inline) */}
              {selectable && selectedRows.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="h-4 w-px bg-border mx-1" />
                  <Badge variant="secondary" className="h-7 px-2 font-mono">
                    {selectedRows.size}
                  </Badge>

                  {selectedRows.size < sortedData.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllFiltered}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hidden sm:flex"
                      title="Chọn tất cả các dòng theo điều kiện lọc hiện tại"
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-1" />
                      Chọn cả {sortedData.length}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    title="Bỏ chọn"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>

                  {onDeleteSelected && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-3 text-xs shadow-sm ml-1"
                      onClick={() => onDeleteSelected(Array.from(selectedRows))}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Xóa
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onSync && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSync}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  Đồng bộ
                </Button>
              )}
              {onImport && (
                <Button variant="outline" size="sm" onClick={onImport}>
                  <Upload className="w-4 h-4 mr-2" />
                  Nhập
                </Button>
              )}
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Xuất
                </Button>
              )}
              {onAdd && (
                <Button size="sm" onClick={onAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  {addLabel}
                </Button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Table with horizontal and vertical scroll, sticky header + pinned columns */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 z-20 bg-table-header">
              <TableRow className="bg-table-header hover:bg-table-header">
                {selectable && (
                  <TableHead className="w-12 sticky left-0 z-30 bg-table-header text-center">
                    <Checkbox
                      checked={isAllPageSelected ? true : isIndeterminate ? "indeterminate" : false}
                      onCheckedChange={handleSelectPage}
                    />
                  </TableHead>
                )}
                {columns.map((column, index) => {
                  // Pin first 2 data columns
                  const isPinned = index < 2;
                  const leftOffset = selectable
                    ? (index === 0 ? '48px' : index === 1 ? '148px' : undefined)
                    : (index === 0 ? '0px' : index === 1 ? '100px' : undefined);

                  return (
                    <TableHead
                      key={String(column.key)}
                      style={{
                        width: column.width,
                        minWidth: column.width,
                        left: isPinned ? leftOffset : undefined,
                      }}
                      className={cn(
                        'h-9 px-2 text-xs font-semibold whitespace-nowrap bg-muted/50 select-none',
                        column.sortable !== false && "cursor-pointer hover:bg-muted/70",
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                        isPinned && 'sticky z-30 bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                      )}
                      onClick={() => column.sortable !== false && handleSort(String(column.key))}
                    >
                      <div className={cn(
                        "flex items-center gap-1",
                        column.align === 'center' && "justify-center",
                        column.align === 'right' && "justify-end"
                      )}>
                        {column.header}
                        {column.sortable !== false && (
                          sortConfig?.key === String(column.key) ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Đang tải...
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-muted/30', // Removed generic hover that might be too tall
                      selectedRows.has(row.id) && 'bg-muted'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                        className="sticky left-0 z-10 bg-background py-1 px-2 text-center" // Reduced padding
                      >
                        <Checkbox
                          checked={selectedRows.has(row.id)}
                          onCheckedChange={(checked) =>
                            handleSelectRow(row.id, checked as boolean)
                          }
                        />
                      </TableCell>
                    )}
                    {columns.map((column, index) => {
                      const value = getValue(row, column.key);
                      // Pin first 2 data columns
                      const isPinned = index < 2;
                      const leftOffset = selectable
                        ? (index === 0 ? '48px' : index === 1 ? '148px' : undefined)
                        : (index === 0 ? '0px' : index === 1 ? '100px' : undefined);

                      return (
                        <TableCell
                          key={String(column.key)}
                          style={{ left: isPinned ? leftOffset : undefined }}
                          className={cn(
                            'py-1 px-2 text-sm', // Reduced padding: py-1 px-2
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            isPinned && 'sticky z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'
                          )}
                        >
                          {column.render
                            ? column.render(value, row)
                            : (value as ReactNode)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>
            trong tổng số {data.length} bản ghi
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="px-3 text-sm">
            Trang {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
