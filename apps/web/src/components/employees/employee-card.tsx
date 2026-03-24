import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Employee } from "@/services/employee.service";
import { format } from "date-fns";
import { Mail, Phone, Building2, Briefcase, MoreHorizontal, Pencil, Trash2, Calendar, MapPin, ArchiveRestore } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils";
import Link from "next/link";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmployeeCardProps {
    employee: Employee;
    onDelete: (id: string) => void;
    onRestore?: (id: string) => void;
    onHardDelete?: (id: string) => void;
    isDeletedView?: boolean;
    delay?: number;
}

export function EmployeeCard({ employee, onDelete, onRestore, onHardDelete, isDeletedView = false, delay = 0 }: EmployeeCardProps) {
    const statusMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
        OFFICIAL: { label: "Chính thức", bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
        PROBATION: { label: "Thử việc", bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
        RESIGNED: { label: "Đã nghỉ", bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
        MATERNITY_LEAVE: { label: "Thai sản", bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
        SEASONAL: { label: "Thời vụ", bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
    };
    const status = statusMap[employee.employmentStatus] || { label: employee.employmentStatus, bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" };

    const joinedDate = employee.joinedAt ? format(new Date(employee.joinedAt), 'dd/MM/yyyy') : null;

    return (
        <div
            className="group relative bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
        >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${employee.employmentStatus === "OFFICIAL" ? "bg-emerald-500" :
                employee.employmentStatus === "PROBATION" ? "bg-blue-500" :
                    employee.employmentStatus === "RESIGNED" ? "bg-rose-500" :
                        employee.employmentStatus === "MATERNITY_LEAVE" ? "bg-amber-500" :
                            "bg-violet-500"
                }`} />

            {/* Actions */}
            <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background/80 backdrop-blur-sm">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 border-border shadow-lg">
                        {!isDeletedView ? (
                            <>
                                <DropdownMenuItem asChild>
                                    <Link href={`/employees/${employee.id}/edit`} className="cursor-pointer">
                                        <Pencil className="mr-2 h-3.5 w-3.5" /> Chỉnh sửa
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => onDelete(employee.id)}
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa nhân viên
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                <DropdownMenuItem
                                    className="text-emerald-600 focus:text-emerald-700 cursor-pointer"
                                    onClick={() => onRestore && onRestore(employee.id)}
                                >
                                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" /> Khôi phục
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={() => onHardDelete && onHardDelete(employee.id)}
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa vĩnh viễn
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Main content */}
            <Link href={`/employees/${employee.id}/edit`} className="block">
                <div className="p-4">
                    {/* Header: Avatar + Name + Status */}
                    <div className="flex items-start gap-3">
                        <EmployeeAvatar
                            avatar={employee.avatar}
                            fullName={employee.fullName}
                            className="h-12 w-12 border-2 border-background shadow-sm shrink-0"
                            fallbackClassName="text-sm font-bold"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate capitalize group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {employee.fullName}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate capitalize mt-0.5">
                                {employee.jobTitle?.name || "—"}
                            </p>
                            <Badge variant="outline" className={`border-0 rounded-full px-2 py-0 text-[10px] font-medium mt-1 ${status.bg} ${status.text}`}>
                                <div className={`w-1 h-1 rounded-full mr-1 ${status.dot}`}></div>
                                {status.label}
                            </Badge>
                        </div>
                    </div>

                    {/* Info rows */}
                    <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{employee.department?.name || "—"}{employee.section ? ` · ${employee.section.name}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                            <span className="truncate">{employee.emailCompany || "—"}</span>
                        </div>
                        {employee.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span>{formatPhoneNumber(employee.phone)}</span>
                            </div>
                        )}
                        {joinedDate && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span>Vào làm: {joinedDate}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* Footer */}
            <div className="px-4 py-2 bg-muted/30 border-t border-border/50 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground/70">{employee.employeeCode}</span>
                <span className="text-[11px] text-muted-foreground/70">{format(new Date(employee.createdAt), 'dd/MM/yyyy')}</span>
            </div>
        </div>
    );
}
