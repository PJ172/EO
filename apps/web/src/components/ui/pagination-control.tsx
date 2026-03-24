import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    filteredCount?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
    className?: string;
}

export function PaginationControl({
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    filteredCount,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [50, 100, 200, 500],
    className
}: PaginationControlProps) {
    const isZero = totalCount === 0;
    const safeCurrentPage = isZero ? 1 : currentPage;
    const safeTotalPages = isZero ? 1 : (totalPages || 1);
    const currentShowing = isZero ? 0 : Math.min(pageSize, totalCount - (safeCurrentPage - 1) * pageSize);

    return (
        <div className={cn("flex flex-wrap items-center justify-end gap-x-12 gap-y-2 px-2 w-full py-2 mt-auto bg-background", className)}>
            <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-4">Tổng số: <span className="font-medium text-foreground">{filteredCount !== undefined ? filteredCount : currentShowing} / {totalCount}</span> bản ghi</span>
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Số dòng/ trang</p>
                    <select
                        className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center justify-center text-sm font-medium">
                    Trang {safeCurrentPage} / {safeTotalPages}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(1)}
                        disabled={safeCurrentPage === 1 || isZero}
                    >
                        <span className="sr-only">Về trang đầu</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(safeCurrentPage - 1)}
                        disabled={safeCurrentPage === 1 || isZero}
                    >
                        <span className="sr-only">Trang trước</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => onPageChange(safeCurrentPage + 1)}
                        disabled={safeCurrentPage >= safeTotalPages || isZero}
                    >
                        <span className="sr-only">Trang sau</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="hidden h-8 w-8 p-0 lg:flex"
                        onClick={() => onPageChange(safeTotalPages)}
                        disabled={safeCurrentPage >= safeTotalPages || isZero}
                    >
                        <span className="sr-only">Về trang cuối</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
