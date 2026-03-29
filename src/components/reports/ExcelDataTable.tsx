import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface ColumnDef<T> {
  id: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: T) => ReactNode;
  footer?: (data: T[]) => ReactNode;
  visible?: boolean;
  pinned?: boolean;
  sortable?: boolean;
  sortKey?: keyof T; // Key to use for sorting, defaults to id
}

interface ExcelDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  pageSize?: number;
  enablePagination?: boolean;
  enableSorting?: boolean;
}

type SortDirection = "asc" | "desc" | null;

export function ExcelDataTable<T>({
  data,
  columns,
  onRowClick,
  className,
  pageSize: initialPageSize = 20,
  enablePagination = true,
  enableSorting = true,
}: ExcelDataTableProps<T>) {
  const visibleColumns = columns.filter((col) => col.visible !== false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Handle sorting
  const handleSort = (columnId: string) => {
    if (!enableSorting) return;

    if (sortColumn === columnId) {
      // Cycle: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find(c => c.id === sortColumn);
    if (!column) return data;

    const sortKey = column.sortKey || column.id;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      // Numeric comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Paginate data
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    if (!enablePagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, enablePagination]);

  // Ensure currentPage is valid
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const getSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="w-3 h-3 ml-1 text-primary" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  return (
    <div className={cn("rounded-md border overflow-hidden flex flex-col h-full", className)}>
      <div className="flex-1 overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary/50 z-10 shadow-sm backdrop-blur-sm">
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(
                    "whitespace-nowrap font-bold h-10 px-3",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.pinned && "sticky left-0 bg-background z-20 border-r shadow-[1px_0_0_0_rgba(0,0,0,0.1)]",
                    enableSorting && col.sortable !== false && "cursor-pointer hover:bg-muted/50 select-none"
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.id)}
                >
                  <div className={cn(
                    "flex items-center",
                    col.align === "right" && "justify-end",
                    col.align === "center" && "justify-center"
                  )}>
                    {col.label}
                    {enableSorting && col.sortable !== false && getSortIcon(col.id)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, i) => (
                <TableRow
                  key={i}
                  className={cn("hover:bg-muted/50 transition-colors", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        "py-2 px-3 whitespace-nowrap",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.pinned && "sticky left-0 bg-background z-10 border-r shadow-[1px_0_0_0_rgba(0,0,0,0.1)] group-hover:bg-muted/50"
                      )}
                    >
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {sortedData.length > 0 && visibleColumns.some(c => c.footer) && (
            <TableFooter className="sticky bottom-0 bg-secondary/80 font-bold z-10 shadow-inner backdrop-blur-sm">
              <TableRow>
                {visibleColumns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={cn(
                      "py-2 px-3 whitespace-nowrap",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.pinned && "sticky left-0 bg-secondary/80 z-20 border-r"
                    )}
                  >
                    {col.footer ? col.footer(sortedData) : null}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Pagination Controls */}
      {enablePagination && totalItems > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Hiển thị</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>trong tổng số <strong>{totalItems}</strong> bản ghi</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[80px] text-center">
              Trang {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
