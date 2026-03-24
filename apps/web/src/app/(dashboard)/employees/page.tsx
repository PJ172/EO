"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQueryState } from 'nuqs';
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/ui/page-header";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import { useAuth } from "@/contexts/auth-context";
import {
    Plus, FileDown, ArrowUpDown, ChevronUp, ChevronDown, Trash2,
    LayoutList, LayoutGrid, Users, UserCheck, UserX, Clock,
    MoreHorizontal, Pencil, Upload, ArchiveRestore, Settings2, Save, X, RotateCw, Filter,
    Building2, Factory, GitFork, Calendar, Briefcase
} from "lucide-react";
import {
    useEmployees, useExportEmployees, useDeleteEmployee, useBulkDeleteEmployees,
    useRestoreEmployee, useHardDeleteEmployee, useUpdateEmployee,
    restoreEmployee, hardDeleteEmployee
} from "@/services/employee.service";
import { useDepartments } from "@/services/department.service";
import { useCompanies } from "@/services/company.service";
import { useFactories } from "@/services/factory.service";
import { useDivisions } from "@/services/division.service";
import { useSections } from "@/services/section.service";
import { useJobTitles } from "@/services/employee.service";
import Link from "next/link";
import { SearchBar } from "@/components/ui/search-bar";
import { ImportEmployeeDialog } from "@/components/employees/import-employee-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { PaginationControl } from "@/components/ui/pagination-control";
import { EmployeeCard } from "@/components/employees/employee-card";
import { ColumnConfigDialog } from "@/components/ui/column-config-dialog";
import { useSortState } from "@/hooks/use-sort-state";
import { useTableColumns, ColumnDef } from "@/hooks/use-table-columns";
import { Columns3 } from "lucide-react";
import { formatPhoneNumber, cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Default column definitions for employee table
const EMPLOYEE_DEFAULT_COLUMNS: ColumnDef[] = [
    // === Thông tin cơ bản ===
    { key: "employeeCode", label: "Mã nhân viên" },
    { key: "fullName", label: "Họ và tên" },
    { key: "gender", label: "Giới tính" },
    { key: "dob", label: "Ngày sinh" },
    { key: "age", label: "Tuổi" },
    { key: "birthPlace", label: "Nơi sinh" },
    { key: "maritalStatus", label: "Hôn nhân" },
    { key: "ethnicity", label: "Dân tộc" },
    { key: "religion", label: "Tôn giáo" },
    // === Tổ chức ===
    { key: "department", label: "Phòng ban" },
    { key: "jobTitle", label: "Chức vụ" },
    { key: "employmentStatus", label: "Trạng thái" },
    { key: "company", label: "Công ty" },
    { key: "factory", label: "Nhà máy" },
    { key: "division", label: "Khối" },
    { key: "section", label: "Bộ phận" },
    { key: "manager", label: "Quản lý" },
    // === Liên hệ ===
    { key: "phone", label: "SĐT" },
    { key: "email", label: "Email công ty" },
    { key: "personalEmail", label: "Email cá nhân" },
    { key: "emergencyPhone", label: "SĐT khẩn cấp" },
    { key: "emergencyContactName", label: "Người LH khẩn cấp" },
    { key: "referrer", label: "Người giới thiệu" },
    { key: "permanentAddress", label: "Địa chỉ thường trú" },
    { key: "temporaryAddress", label: "Địa chỉ tạm trú" },
    // === Giấy tờ ===
    { key: "nationalId", label: "Số CCCD" },
    { key: "dateOfIssue", label: "Ngày cấp CCCD" },
    { key: "placeOfIssue", label: "Nơi cấp CCCD" },
    // === Tài chính & Bảo hiểm ===
    { key: "taxCode", label: "Mã số thuế" },
    { key: "socialInsuranceNo", label: "BHXH" },
    { key: "healthInsuranceNo", label: "BHYT" },
    { key: "salaryLevel", label: "Bậc lương" },
    { key: "bankName", label: "Ngân hàng" },
    { key: "bankBranch", label: "Chi nhánh NH" },
    { key: "bankAccountNo", label: "Số tài khoản" },
    // === Hợp đồng ===
    { key: "contractType", label: "Loại HĐ" },
    { key: "contractNumber", label: "Số HĐ" },
    { key: "contractStartDate", label: "HĐ bắt đầu" },
    { key: "contractEndDate", label: "HĐ kết thúc" },
    { key: "contracts", label: "Danh sách HĐ" },
    // === Ngày tháng ===
    { key: "joinedAt", label: "Ngày vào" },
    { key: "resignedAt", label: "Ngày nghỉ việc" },
    // === Học vấn ===
    { key: "education", label: "Trình độ" },
    { key: "major", label: "Chuyên ngành" },
    { key: "school", label: "Trường" },
    { key: "graduationYear", label: "Năm TN" },
    // === Khác ===
    { key: "recordCode", label: "Mã hồ sơ" },
    { key: "accessCardStatus", label: "Thẻ từ" },
    { key: "uniformShirtSize", label: "Size áo" },
    { key: "uniformPantsSize", label: "Size quần" },
    { key: "shoeSize", label: "Size giầy" },
    { key: "familyMembers", label: "Người thân" },
    { key: "note", label: "Ghi chú (Hồ sơ)" },
    // === Audit ===
    { key: "createdAt", label: "Ngày tạo" },
    { key: "createdBy", label: "Người tạo" },
    { key: "updatedAt", label: "Ngày sửa" },
    { key: "updatedBy", label: "Người sửa" },
];

const getContractLabel = (type?: string) => {
    const labels: Record<string, string> = {
        PROBATION: "Thử việc",
        DEFINITE_TERM: "Có thời hạn",
        INDEFINITE_TERM: "Không thời hạn",
        SEASONAL: "Thời vụ",
        ONE_YEAR: "1 năm",
        TWO_YEARS: "2 năm",
        THREE_YEARS: "3 năm",
    };
    return type ? labels[type] || type : "—";
};

const getGenderLabel = (g?: string) => {
    const m: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };
    return g ? m[g] || g : "—";
};

const getMaritalLabel = (s?: string) => {
    const m: Record<string, string> = { SINGLE: "Độc thân", MARRIED: "Đã kết hôn", DIVORCED: "Ly hôn" };
    return s ? m[s] || s : "—";
};

const getEducationLabel = (e?: string) => {
    const m: Record<string, string> = {
        PRIMARY: "Tiểu học", SECONDARY: "THCS", HIGH_SCHOOL: "THPT", VOCATIONAL: "Trung cấp", COLLEGE: "Cao đẳng", UNIVERSITY: "Đại học", MASTER: "Thạc sĩ", DOCTOR: "Tiến sĩ",
        GRADE_12_12: "12/12", GRADE_11_12: "11/12", GRADE_10_12: "10/12", GRADE_9_12: "9/12", GRADE_8_12: "8/12", GRADE_7_12: "7/12",
        GRADE_6_12: "6/12", GRADE_5_12: "5/12", GRADE_4_12: "4/12", GRADE_3_12: "3/12", GRADE_2_12: "2/12", GRADE_1_12: "1/12"
    };
    return e ? m[e] || e : "—";
};

const getCardStatusLabel = (s?: string) => {
    const m: Record<string, string> = { ISSUED: "Đã cấp", NOT_ISSUED: "Chưa cấp", DAMAGED: "Hư hỏng", LOST: "Mất" };
    return s ? m[s] || s : "—";
};

const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
        OFFICIAL: { label: "Chính thức", bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-500/20" },
        PROBATION: { label: "Thử việc", bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500 dark:bg-blue-400", border: "border-blue-500/20" },
        RESIGNED: { label: "Đã nghỉ", bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500 dark:bg-rose-400", border: "border-rose-500/20" },
        MATERNITY_LEAVE: { label: "Thai sản", bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-500/20" },
        SEASONAL: { label: "Thời vụ", bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500 dark:bg-violet-400", border: "border-violet-500/20" },
    };
    const b = badges[status];
    if (!b) return <Badge variant="outline">{status}</Badge>;
    return (
        <Badge variant="outline" className={`border-0 rounded-full px-3 py-1 font-medium ${b.bg} ${b.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${b.dot}`}></div>
            {b.label}
        </Badge>
    );
};

const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
        return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
        return dateString;
    }
};

// Mini component for BirthDate to avoid heavy logic in renderCell
const BirthDateCell = React.memo(({ dob }: { dob?: string }) => {
    const txt = "text-xs text-foreground whitespace-nowrap";
    if (!dob) return <span className={txt}>—</span>;
    
    // Memoize the calculation based on dob and "today" (daily basis)
    const { label, cls, daysLeft } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const bDate = new Date(dob);
        let nextBirthday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
        if (nextBirthday.getTime() < today.getTime()) {
            nextBirthday = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
        }
        const utc1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const utc2 = Date.UTC(nextBirthday.getFullYear(), nextBirthday.getMonth(), nextBirthday.getDate());
        const dLeft = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

        let c = txt;
        if (dLeft === 0) c = "text-sm font-bold text-red-500 flex items-center gap-1";
        else if (dLeft <= 3) c = "text-sm font-bold text-red-500";
        else if (dLeft <= 15) c = "text-sm font-semibold text-amber-500";
        else if (dLeft <= 30) c = "text-sm font-medium text-blue-500";
        
        return { label: formatDate(dob), cls: c, daysLeft: dLeft };
    }, [dob]);

    return (
        <span className={cls} title={`Sinh nhật vào ${label}`}>
            {label}
            {daysLeft === 0 && <span className="animate-pulse">🎂</span>}
        </span>
    );
});
BirthDateCell.displayName = "BirthDateCell";

const AgeCell = React.memo(({ age, dob }: { age?: number; dob?: string }) => {
    const txt = "text-xs text-foreground whitespace-nowrap";
    if (age !== undefined && age !== null) return <span className={txt}>{age}</span>;
    if (!dob) return <span className={txt}>—</span>;
    
    const calculatedAge = useMemo(() => {
        const bDate = new Date(dob);
        const today = new Date();
        let a = today.getFullYear() - bDate.getFullYear();
        if (today.getMonth() < bDate.getMonth() || (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate())) {
            a--;
        }
        return a;
    }, [dob]);
    
    return <span className={txt}>{calculatedAge}</span>;
});
AgeCell.displayName = "AgeCell";

const FamilyMembersCell = React.memo(({ members }: { members: any[] }) => {
    const relMap: Record<string, string> = { MOTHER: 'Mẹ', FATHER: 'Bố', SPOUSE: 'Vợ/Chồng', WIFE: 'Vợ', HUSBAND: 'Chồng', CHILD: 'Con', SIBLING: 'Anh/Chị/Em', BROTHER: 'Anh/Em trai', SISTER: 'Chị/Em gái', DEPENDENT: 'Người phụ thuộc', OTHER: 'Khác' };
    if (!members || members.length === 0) return <span className="text-xs text-foreground">—</span>;
    
    const first = members[0];
    const label = `${first.name} (${relMap[first.relationship] || first.relationship})`;
    const remaining = members.length - 1;

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-xs text-foreground cursor-help hover:text-blue-600 underline underline-offset-2 decoration-dotted whitespace-nowrap">
                        {label} {remaining > 0 ? `(+${remaining})` : ""}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-white border shadow-md p-2 max-w-[280px]">
                    <div className="space-y-1.5 text-[11px]">
                        <p className="font-semibold border-b pb-1 text-slate-700">Người thân ({members.length})</p>
                        {members.map((f: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-50 last:border-0 pb-1 last:pb-0">
                                <span className="font-medium text-slate-900 truncate max-w-[140px]" title={f.name}>{f.name}</span>
                                <div className="flex items-center gap-1 text-slate-500 whitespace-nowrap">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0.5 font-normal h-auto bg-slate-50">{relMap[f.relationship] || f.relationship}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
FamilyMembersCell.displayName = "FamilyMembersCell";

const ContractsCell = React.memo(({ contracts }: { contracts?: any[] }) => {
    const typeMap: Record<string, string> = { PROBATION: 'Thử việc', DEFINITE_TERM: 'Có thời hạn', INDEFINITE_TERM: 'Không thời hạn', SEASONAL: 'Thời vụ', ONE_YEAR: '1 năm', TWO_YEARS: '2 năm', THREE_YEARS: '3 năm' };
    if (!contracts || contracts.length === 0) return <span className="text-xs text-foreground">—</span>;
    
    const first = contracts[0];
    const label = first.contractNumber ? `${first.contractNumber} (${typeMap[first.contractType] || first.contractType})` : `HĐ (${typeMap[first.contractType] || first.contractType})`;
    const remaining = contracts.length - 1;

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="text-xs text-foreground cursor-help hover:text-emerald-600 underline underline-offset-2 decoration-dotted whitespace-nowrap">
                        {label} {remaining > 0 ? `(+${remaining})` : ""}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-white border shadow-md p-2 max-w-[280px]">
                    <div className="space-y-1.5 text-[11px]">
                        <p className="font-semibold border-b pb-1 text-slate-700">Hợp đồng ({contracts.length})</p>
                        {contracts.map((c: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-50 last:border-0 pb-1 last:pb-0">
                                <span className="font-medium text-slate-900 truncate max-w-[140px]" title={c.contractNumber}>{c.contractNumber || "Chưa số"}</span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0.5 font-normal h-auto bg-slate-50 whitespace-nowrap">{typeMap[c.contractType] || c.contractType}</Badge>
                            </div>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});
ContractsCell.displayName = "ContractsCell";

const CellContent = React.memo(({
    employee,
    colKey,
    isEditing,
    editValue,
    onEditChange,
    onEditSave,
    onEditCancel
}: {
    employee: any,
    colKey: string,
    isEditing?: boolean,
    editValue?: string,
    onEditChange?: (val: string) => void,
    onEditSave?: () => void,
    onEditCancel?: () => void
}) => {
    const txt = "text-xs text-foreground whitespace-nowrap";
    const wrapTxt = "text-xs text-foreground whitespace-normal break-words leading-relaxed";
    const mono = "text-xs text-foreground font-medium whitespace-nowrap";

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                <input
                    autoFocus
                    className="w-full h-7 px-2 text-sm bg-white dark:bg-slate-900 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={editValue || ""}
                    onChange={(e) => onEditChange?.(e.target.value)}
                    onBlur={onEditSave}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onEditSave?.();
                        if (e.key === "Escape") onEditCancel?.();
                    }}
                />
            </div>
        );
    }

    switch (colKey) {
        case "employeeCode":
            return <Link href={`/employees/${employee.id}/edit`} className="text-xs font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-500 hover:underline transition-colors whitespace-nowrap">{employee.employeeCode}</Link>;
        case "fullName":
            return (
                <div className="flex items-center gap-3">
                    <EmployeeAvatar avatar={employee.avatar} fullName={employee.fullName} className="h-8 w-8 flex-shrink-0" fallbackClassName="text-xs" />
                    <Link href={`/employees/${employee.id}/edit`} className="text-xs font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-500 hover:underline transition-colors whitespace-normal break-words leading-tight">{employee.fullName}</Link>
                </div>
            );
        case "gender": return <span className={txt}>{getGenderLabel(employee.gender)}</span>;
        case "age": return <AgeCell age={employee.age} dob={employee.dob} />;
        case "dob": return <BirthDateCell dob={employee.dob} />;
        case "birthPlace": return <span className={txt}>{employee.birthPlace || "—"}</span>;
        case "maritalStatus": return <span className={txt}>{getMaritalLabel(employee.maritalStatus)}</span>;
        case "ethnicity": return <span className={txt}>{employee.ethnicity || "—"}</span>;
        case "religion": return <span className={txt}>{employee.religion || "—"}</span>;
        case "department": return <span className="text-xs text-muted-foreground">{employee.department?.name || "—"}</span>;
        case "jobTitle": return <span className="text-xs font-medium text-foreground capitalize">{employee.jobTitle?.name || "—"}</span>;
        case "employmentStatus": return getStatusBadge(employee.employmentStatus);
        case "company":
            return <span className={wrapTxt}>{employee.company?.name || "—"}</span>;
        case "factory": return <span className={wrapTxt}>{employee.factory?.name || "—"}</span>;
        case "division": return <span className={wrapTxt}>{employee.division?.name || "—"}</span>;
        case "section": return <span className={wrapTxt}>{employee.section?.name || "—"}</span>;
        case "manager": return <span className={wrapTxt}>{employee.manager?.fullName || "—"}</span>;
        case "phone": return <span className={txt}>{formatPhoneNumber(employee.phone) || "—"}</span>;
        case "email": return <span className="text-xs text-muted-foreground whitespace-normal break-all leading-tight">{employee.emailCompany || "—"}</span>;
        case "personalEmail": return <span className="text-xs text-muted-foreground whitespace-normal break-all leading-tight">{employee.personalEmail || "—"}</span>;
        case "emergencyPhone": return <span className={txt}>{formatPhoneNumber(employee.emergencyPhone) || "—"}</span>;
        case "emergencyContactName": return <span className={txt}>{employee.emergencyContactName || "—"}</span>;
        case "referrer": return <span className={txt}>{employee.referrer || "—"}</span>;
        case "permanentAddress": return <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{employee.permanentAddress || "—"}</span>;
        case "temporaryAddress": return <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{employee.temporaryAddress || "—"}</span>;
        case "nationalId": return <span className={mono}>{employee.nationalId || "—"}</span>;
        case "dateOfIssue": return <span className={txt}>{formatDate(employee.dateOfIssue)}</span>;
        case "placeOfIssue": return <span className={txt}>{employee.placeOfIssue || "—"}</span>;
        case "taxCode": return <span className={mono}>{employee.taxCode || "—"}</span>;
        case "socialInsuranceNo": return <span className={mono}>{employee.socialInsuranceNo || "—"}</span>;
        case "healthInsuranceNo": return <span className={mono}>{employee.healthInsuranceNo || "—"}</span>;
        case "salaryLevel": return <span className={txt}>{employee.salaryLevel || "—"}</span>;
        case "bankName": return <span className={txt}>{employee.bankName || "—"}</span>;
        case "bankBranch": return <span className={txt}>{employee.bankBranch || "—"}</span>;
        case "bankAccountNo": return <span className={mono}>{employee.bankAccountNo || "—"}</span>;
        case "contractType": return <span className={txt}>{getContractLabel(employee.contractType)}</span>;
        case "contractNumber": return <span className={mono}>{employee.contractNumber || "—"}</span>;
        case "contractStartDate": return <span className={txt}>{formatDate(employee.contractStartDate)}</span>;
        case "contractEndDate": return <span className={txt}>{formatDate(employee.contractEndDate)}</span>;
        case "joinedAt": return <span className={txt}>{formatDate(employee.joinedAt)}</span>;
        case "resignedAt": return <span className={txt}>{formatDate(employee.resignedAt)}</span>;
        case "education": return <span className={txt}>{getEducationLabel(employee.education)}</span>;
        case "major": return <span className={txt}>{employee.major || "—"}</span>;
        case "school": return <span className={txt}>{employee.school || "—"}</span>;
        case "graduationYear": return <span className={txt}>{employee.graduationYear || "—"}</span>;
        case "recordCode": return <span className={mono}>{employee.recordCode || "—"}</span>;
        case "accessCardStatus": return <span className={txt}>{getCardStatusLabel(employee.accessCardStatus)}</span>;
        case "uniformShirtSize": return <span className={txt}>{employee.uniformShirtSize || "—"}</span>;
        case "uniformPantsSize": return <span className={txt}>{employee.uniformPantsSize || "—"}</span>;
        case "shoeSize": return <span className={txt}>{employee.shoeSize || "—"}</span>;
        case "familyMembers": return <FamilyMembersCell members={employee.familyMembers} />;
        case "contracts": return <ContractsCell contracts={employee.contracts} />;
        case "note": return <span className="text-xs text-muted-foreground max-w-[200px] truncate block" title={employee.note}>{employee.note || "—"}</span>;
        case "createdAt": return <span className={txt}>{employee.createdAt ? format(new Date(employee.createdAt), "dd/MM/yyyy HH:mm") : "—"}</span>;
        case "updatedAt": return <span className={txt}>{employee.updatedAt ? format(new Date(employee.updatedAt), "dd/MM/yyyy HH:mm") : "—"}</span>;
        case "createdBy": return <span className={txt}>{employee.createdBy?.username || "—"}</span>;
        case "updatedBy": return <span className={txt}>{employee.updatedBy?.username || "—"}</span>;
        default: return <span className={txt}>—</span>;
    }
}, (prevProps, nextProps) => {
    // Chỉ re-render khi object employee thay đổi hoặc đang ở chế độ edit
    if (prevProps.isEditing !== nextProps.isEditing) return false;
    if (prevProps.editValue !== nextProps.editValue) return false;
    return prevProps.colKey === nextProps.colKey && prevProps.employee.updatedAt === nextProps.employee.updatedAt;
});
CellContent.displayName = "CellContent";

const renderCell = (
    employee: any,
    colKey: string,
    editingCell?: { id: string, key: string } | null,
    editValue?: string,
    onEditChange?: (val: string) => void,
    onEditSave?: () => void,
    onEditCancel?: () => void
) => (
    <CellContent
        employee={employee}
        colKey={colKey}
        isEditing={editingCell?.id === employee.id && editingCell?.key === colKey}
        editValue={editValue}
        onEditChange={onEditChange}
        onEditSave={onEditSave}
        onEditCancel={onEditCancel}
    />
);

const EmployeeRow = React.memo(({
    employee,
    index,
    isSelected,
    visibleColumns,
    onMouseDown,
    onMouseEnter,
    onSelect,
    onDoubleClickCell,
    editingCell,
    editValue,
    onEditChange,
    onEditSave,
    onEditCancel
}: {
    employee: any,
    index: number,
    isSelected: boolean,
    visibleColumns: any[],
    onMouseDown: (index: number, id: string, e: React.MouseEvent) => void,
    onMouseEnter: (id: string) => void,
    onSelect: (id: string, checked: boolean) => void,
    onDoubleClickCell: (id: string, key: string, currentVal: any) => void,
    editingCell?: { id: string, key: string } | null,
    editValue?: string,
    onEditChange?: (val: string) => void,
    onEditSave?: () => void,
    onEditCancel?: () => void
}) => {
    return (
        <TableRow
            data-state={isSelected && "selected"}
            className="group cursor-default"
            onMouseEnter={() => onMouseEnter(employee.id)}
            onMouseDown={(e) => onMouseDown(index, employee.id, e)}
        >
            <TableCell
                className="border-r border-border/20 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(employee.id, !isSelected);
                }}
            >
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(employee.id, checked as boolean)}
                    onClick={(e) => e.stopPropagation()}
                />
            </TableCell>
            {visibleColumns.map(col => (
                <TableCell
                    key={col.key}
                    className={cn(
                        "border-r border-border/20 last:border-r-0 p-0 align-top",
                        ["fullName", "company", "factory", "division", "section", "email", "personalEmail", "department"].includes(col.key) 
                            ? "overflow-visible" 
                            : "overflow-hidden text-ellipsis"
                    )}
                    onDoubleClick={() => onDoubleClickCell(employee.id, col.key, employee[col.key])}
                    style={{
                        width: `var(--col-w-${col.key}, auto)`,
                        maxWidth: `var(--col-w-${col.key}, auto)`
                    }}
                >
                    <div className="px-4 py-3">
                        {renderCell(employee, col.key, editingCell, editValue, onEditChange, onEditSave, onEditCancel)}
                    </div>
                </TableCell>
            ))}
        </TableRow>
    );
});
EmployeeRow.displayName = "EmployeeRow";

export default function EmployeeListPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const { sortKey, sortDir, handleSort: toggleSort, resetSort } = useSortState("employees", "employeeCode", "asc");
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "" });
    const [companyFilter, setCompanyFilter] = useQueryState("company", { defaultValue: "" });
    const [factoryFilter, setFactoryFilter] = useQueryState("factory", { defaultValue: "" });
    const [divisionFilter, setDivisionFilter] = useQueryState("division", { defaultValue: "" });
    const [departmentFilter, setDepartmentFilter] = useQueryState("department", { defaultValue: "" });
    const [sectionFilter, setSectionFilter] = useQueryState("section", { defaultValue: "" });
    const [jobTitleFilter, setJobTitleFilter] = useQueryState("jobTitle", { defaultValue: "" });
    const [dobFrom, setDobFrom] = useQueryState("dobFrom", { defaultValue: "" });
    const [dobTo, setDobTo] = useQueryState("dobTo", { defaultValue: "" });
    const [joinedFrom, setJoinedFrom] = useQueryState("joinedFrom", { defaultValue: "" });
    const [joinedTo, setJoinedTo] = useQueryState("joinedTo", { defaultValue: "" });
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
    
    // Fetch options for filters (With Cascade support)
    const { data: compResp } = useCompanies({ limit: 100, excludeFromFilters: "false" } as any);
    const { data: facResp } = useFactories({ limit: 100, companyId: companyFilter || undefined, excludeFromFilters: "false" } as any);
    const { data: divResp } = useDivisions({ limit: 100, factoryId: factoryFilter || undefined, excludeFromFilters: "false" } as any);
    const { data: deptResponse } = useDepartments({ limit: 100, divisionId: divisionFilter || undefined, excludeFromFilters: "false" } as any);
    const { data: secResp } = useSections({ limit: 100, departmentId: departmentFilter || undefined, excludeFromFilters: "false" } as any);
    const { data: jtResp } = useJobTitles();

    const companies = compResp?.data || [];
    const factories = facResp?.data || [];
    const divisions = divResp?.data || [];
    const departments = deptResponse?.data || [];
    const sections = secResp?.data || [];
    const jobTitles = jtResp?.data || [];

    const [isSelectionTransitioning, startSelectionTransition] = React.useTransition();
    
    // Inline edit state
    const [editingCell, setEditingCell] = useState<{ id: string, key: string } | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const updateEmployee = useUpdateEmployee();
    
    // Virtualization
    const parentRef = useRef<HTMLDivElement>(null);

    // Drag-select state
    const isDragging = useRef(false);
    const dragStartIndex = useRef<number | null>(null);
    const lastShiftIndex = useRef<number | null>(null);

    const exportMutation = useExportEmployees();
    const deleteEmployee = useDeleteEmployee();
    const bulkDeleteEmployees = useBulkDeleteEmployees();
    const { checkPermission, user } = useAuth();
    const isAdmin = checkPermission("EMPLOYEE_UPDATE") || checkPermission("EMPLOYEE_CREATE");

    const handleDoubleClickCell = useCallback((id: string, key: string, currentVal: any) => {
        if (!isAdmin) return;
        // Các trường cho phép sửa nhanh (text fields)
        const editableFields = ["phone", "emailCompany", "personalEmail", "note", "temporaryAddress", "permanentAddress", "nationalId", "taxCode", "recordCode", "salaryLevel", "bankAccountNo", "bankName", "bankBranch"];
        if (!editableFields.includes(key)) return;

        setEditingCell({ id, key });
        setEditValue(currentVal || "");
    }, [isAdmin]);

    const handleEditSave = useCallback(async () => {
        if (!editingCell) return;
        const { id, key } = editingCell;
        
        try {
            await updateEmployee.mutateAsync({ id, [key]: editValue });
            toast.success("Đã cập nhật dữ liệu");
            setEditingCell(null);
        } catch (error: any) {
            toast.error("Lỗi khi cập nhật");
        }
    }, [editingCell, editValue, updateEmployee]);

    const handleEditCancel = useCallback(() => {
        setEditingCell(null);
    }, []);

    // Column configuration
    const { visibleColumns, allColumns } = useTableColumns("employees", EMPLOYEE_DEFAULT_COLUMNS);

    // --- Column width persistence ---
    const colWidthStorageKey = user?.id ? `employee-col-widths-${user.id}` : null;

    // Restore saved column widths from localStorage on mount
    useEffect(() => {
        if (!colWidthStorageKey) return;
        try {
            const saved = localStorage.getItem(colWidthStorageKey);
            if (saved) {
                const widths: Record<string, number> = JSON.parse(saved);
                Object.entries(widths).forEach(([key, w]) => {
                    document.documentElement.style.setProperty(`--col-w-${key}`, `${w}px`);
                });
            }
        } catch { /* ignore */ }
    }, [colWidthStorageKey]);

    // Helper to persist a column width immediately
    const saveColWidth = useCallback((colKey: string, width: number) => {
        if (!colWidthStorageKey) return;
        try {
            const saved = localStorage.getItem(colWidthStorageKey);
            const widths: Record<string, number> = saved ? JSON.parse(saved) : {};
            const newWidths = { ...widths, [colKey]: width };
            localStorage.setItem(colWidthStorageKey, JSON.stringify(newWidths));
        } catch { /* ignore */ }
    }, [colWidthStorageKey]);

    // --------------------------------
    // --------------------------------

    // Search debounce - stabilize with clear previous timeout
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setPage(1);
        }, 300); // Faster response as typing lag is gone
    }, []);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, []);

    // Sort icon — only shown when column is actively sorted
    const SortIcon = ({ field }: { field: string }) => {
        if (sortKey !== field) return null;
        return sortDir === "asc"
            ? <ChevronUp className="ml-1.5 shrink-0 h-3.5 w-3.5 text-foreground" />
            : <ChevronDown className="ml-1.5 shrink-0 h-3.5 w-3.5 text-foreground" />;
    };

    const handleRefresh = () => {
        resetSort();
        refetch();
    };

    const handleExport = async () => {
        try {
            await exportMutation.mutateAsync({});
            toast.success("Xuất dữ liệu thành công!");
        } catch {
            toast.error("Lỗi xuất dữ liệu");
        }
    };

    const { data, isLoading, refetch } = useEmployees({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        companyId: companyFilter || undefined,
        factoryId: factoryFilter || undefined,
        divisionId: divisionFilter || undefined,
        departmentId: departmentFilter || undefined,
        sectionId: sectionFilter || undefined,
        jobTitleId: jobTitleFilter || undefined,
        dobFrom: dobFrom || undefined,
        dobTo: dobTo || undefined,
        joinedFrom: joinedFrom || undefined,
        joinedTo: joinedTo || undefined,
        sortBy: sortKey,
        order: sortDir,
    });

    const employees = data?.data || [];

    const rowVirtualizer = useVirtualizer({
        count: employees.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45, // Chiều cao ước tính của một hàng
        overscan: 10,
    });

    // Stats calculation based on backend response
    const [cachedStats, setCachedStats] = useState({
        total: 0,
        sunplast: 0,
        otherCompany: 0,
        official: 0,
        probation: 0,
        seasonal: 0,
        resigned: 0
    });

    useEffect(() => {
        const stats = (data?.meta as any)?.stats;
        if (!debouncedSearch && stats) {
            setCachedStats(stats);
        }
    }, [(data?.meta as any)?.stats, debouncedSearch]);

    // O(1) lookup for checkbox render — avoids O(n) .includes() on every row
    const selectedSet = useMemo(() => new Set(selectedRows), [selectedRows]);

    // Ref so handleRowMouseDown doesn't re-create when selectedRows changes
    // (prevents 371 rows from re-rendering on every checkbox tick)
    const selectedRowsRef = useRef<string[]>(selectedRows);
    useEffect(() => { selectedRowsRef.current = selectedRows; }, [selectedRows]);

    // Selection handlers - memoize to prevent row re-renders
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedRows(employees.map((emp: any) => emp.id));
        } else {
            setSelectedRows([]);
        }
    }, [employees]);

    const handleSelectRow = useCallback((id: string, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => prev.includes(id) ? prev : [...prev, id]);
        } else {
            setSelectedRows(prev => prev.filter(rowId => rowId !== id));
        }
    }, []);

    // Drag select handlers
    const handleRowMouseDown = useCallback((index: number, id: string, e: React.MouseEvent) => {
        if (e.shiftKey && lastShiftIndex.current !== null) {
            e.preventDefault();
            const start = Math.min(lastShiftIndex.current, index);
            const end = Math.max(lastShiftIndex.current, index);
            const rangeIds = employees.slice(start, end + 1).map((emp: any) => emp.id);
            setSelectedRows((prev: string[]) => {
                const newSet = new Set(prev);
                rangeIds.forEach((rid: string) => newSet.add(rid));
                return Array.from(newSet);
            });
            return;
        }
        lastShiftIndex.current = index;
        isDragging.current = true;
        dragStartIndex.current = index;
        // Use ref — no re-create on each selectedRows change
        const isSelected = selectedRowsRef.current.includes(id);
        if (isSelected) {
            setSelectedRows(prev => prev.filter(r => r !== id));
        } else {
            setSelectedRows(prev => [...prev, id]);
        }
    }, [employees]); // ← removed selectedRows from deps — only recreates when employees list changes

    const handleRowMouseEnter = useCallback((id: string) => {
        if (!isDragging.current) return;
        startSelectionTransition(() => {
            setSelectedRows(prev => {
                if (prev.includes(id)) return prev;
                return [...prev, id];
            });
        });
    }, []); // setSelectedRows and startSelectionTransition are stable

    useEffect(() => {
        const handleMouseUp = () => { isDragging.current = false; };
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
            try {
                const result = await deleteEmployee.mutateAsync(id);
                toast.success("Đã chuyển vào Thùng rác", {
                    description: "Dữ liệu sẽ được lưu trong 30 ngày.",
                    action: result && result.batchId ? {
                        label: "Khôi phục",
                        onClick: async () => {
                            try {
                                const { trashApi } = await import("@/lib/api/settings/trash");
                                await trashApi.restoreBatch(result.batchId as string);
                                toast.success("Đã khôi phục thành công");
                                refetch();
                            } catch (e) {
                                toast.error("Lỗi khi khôi phục dữ liệu");
                            }
                        }
                    } : undefined,
                    duration: 5000,
                });
                refetch();
            } catch {
                toast.error("Lỗi xóa nhân viên");
            }
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedRows.length} nhân viên đã chọn?`)) return;
        try {
            const result = await bulkDeleteEmployees.mutateAsync(selectedRows);
            if (result.success) {
                toast.success(`Đã chuyển ${result.count} nhân viên vào Thùng rác`, {
                    description: "Dữ liệu sẽ được lưu trong 30 ngày.",
                    action: result.batchId ? {
                        label: "Khôi phục",
                        onClick: async () => {
                            try {
                                const { trashApi } = await import("@/lib/api/settings/trash");
                                await trashApi.restoreBatch(result.batchId as string);
                                toast.success("Đã khôi phục thành công");
                                refetch();
                            } catch (e) {
                                toast.error("Lỗi khi khôi phục dữ liệu");
                            }
                        }
                    } : undefined,
                    duration: 5000,
                });
                setSelectedRows([]);
                refetch();
            }
        } catch (error: any) {
            toast.error(`Lỗi xóa nhân viên: ${error?.response?.data?.message || error.message || ""}`);
        }
    };

    const handleBulkRestore = async () => {
        if (!confirm(`Bạn có chắc chắn muốn khôi phục ${selectedRows.length} nhân viên đã chọn?`)) return;
        try {
            // Restore one by one for now since backend doesn't have bulkRestore
            let successCount = 0;
            for (const id of selectedRows) {
                await restoreEmployee(id);
                successCount++;
            }
            toast.success(`Đã khôi phục ${successCount} nhân viên thành công`);
            setSelectedRows([]);
            refetch();
        } catch (error: any) {
            toast.error(`Lỗi khôi phục: ${error?.response?.data?.message || error.message || ""}`);
        }
    }

    const handleBulkHardDelete = async () => {
        if (!confirm(`CẢNH BÁO: Xóa vĩnh viễn ${selectedRows.length} nhân viên này KHÔNG THỂ KHÔI PHỤC. Vẫn tiếp tục?`)) return;
        try {
            let successCount = 0;
            for (const id of selectedRows) {
                await hardDeleteEmployee(id);
                successCount++;
            }
            toast.success(`Đã xóa vĩnh viễn ${successCount} nhân viên thành công`);
            setSelectedRows([]);
            refetch();
        } catch (error: any) {
            toast.error(`Lỗi xóa: ${error?.response?.data?.message || error.message || ""}`);
        }
    }

    const activePills = useMemo(() => {
        const arr = [];
        if (statusFilter) {
            const label = statusFilter === "PROBATION" ? "Thử việc" : statusFilter === "OFFICIAL" ? "Chính thức" : statusFilter === "SEASONAL" ? "Thời vụ" : "Đã nghỉ việc";
            arr.push({ key: "status", label: `Trạng thái: ${label}`, onClear: () => setStatusFilter("") });
        }
        if (companyFilter) {
            const item = companies.find((c: any) => c.id === companyFilter);
            arr.push({ key: "company", label: `Cty: ${item?.name || "..."}`, onClear: () => { setCompanyFilter(""); setFactoryFilter(""); setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); } });
        }
        if (factoryFilter) {
            const item = factories.find((f: any) => f.id === factoryFilter);
            arr.push({ key: "factory", label: `Nhà máy: ${item?.name || "..."}`, onClear: () => { setFactoryFilter(""); setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); } });
        }
        if (divisionFilter) {
            const item = divisions.find((d: any) => d.id === divisionFilter);
            arr.push({ key: "division", label: `Khối: ${item?.name || "..."}`, onClear: () => { setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); } });
        }
        if (departmentFilter) {
            const dept = departments.find((d: any) => d.id === departmentFilter);
            arr.push({ key: "department", label: `Phòng ban: ${dept?.name || "..."}`, onClear: () => { setDepartmentFilter(""); setSectionFilter(""); } });
        }
        if (sectionFilter) {
            const item = sections.find((s: any) => s.id === sectionFilter);
            arr.push({ key: "section", label: `Bộ phận: ${item?.name || "..."}`, onClear: () => setSectionFilter("") });
        }
        if (jobTitleFilter) {
            const item = jobTitles.find((j: any) => j.id === jobTitleFilter);
            arr.push({ key: "jobTitle", label: `Chức vụ: ${item?.name || "..."}`, onClear: () => setJobTitleFilter("") });
        }
        if (dobFrom || dobTo) {
            arr.push({ key: "dob", label: `Ngày sinh: ${dobFrom || ""} - ${dobTo || ""}`, onClear: () => { setDobFrom(""); setDobTo(""); } });
        }
        if (joinedFrom || joinedTo) {
            arr.push({ key: "joined", label: `Vào làm: ${joinedFrom || ""} - ${joinedTo || ""}`, onClear: () => { setJoinedFrom(""); setJoinedTo(""); } });
        }
        return arr;
    }, [statusFilter, companyFilter, factoryFilter, divisionFilter, departmentFilter, sectionFilter, jobTitleFilter, dobFrom, dobTo, joinedFrom, joinedTo, companies, factories, divisions, departments, sections, jobTitles]);

    if (!checkPermission("EMPLOYEE_READ")) {
        return <div className="flex items-center justify-center p-8 mt-20 text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] space-y-2 p-2 bg-background">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-blue-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tổng nhân viên</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.total}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-indigo-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">NV Sunplast</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.sunplast}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-slate-400 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Công ty khác</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.otherCompany}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-emerald-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Đang làm việc</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.official}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-amber-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Thử việc</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.probation}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-cyan-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Thời vụ</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.seasonal}</h3>
                    </div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl border-y border-r border-l-4 border-l-rose-500 p-2.5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">Đã nghỉ việc</p>
                        <h3 className="text-lg font-bold mt-0.5">{cachedStats.resigned}</h3>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm rounded-xl p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <PageHeader
                    title="Hồ sơ Nhân sự"
                    icon={
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-primary to-primary/80">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                    }
                    className="mb-0 border-none bg-transparent p-0 shadow-none"
                    onRefresh={handleRefresh}
                    isRefreshing={isLoading}
                    refreshLabel="Làm mới"
                    pills={
                        activePills.map(pill => (
                             <Badge key={pill.key} className="h-7 px-2.5 gap-1.5 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 border-none rounded-lg text-xs font-medium transition-all shadow-none">
                                 <span>{pill.label}</span>
                                 <div 
                                     className="flex items-center justify-center rounded-full hover:bg-blue-500/20 p-0.5 cursor-pointer pointer-events-auto"
                                     onClick={(e) => { e.preventDefault(); e.stopPropagation(); pill.onClear(); }}
                                 >
                                     <X className="h-3 w-3 transition-colors" />
                                 </div>
                             </Badge>
                        ))
                    }
                    search={
                        <div className="flex items-center gap-4">
                            <div className="relative group flex-1">
                                <SearchBar
                                    placeholder="Tìm theo tên, mã nhân viên, SĐT..."
                                    defaultValue={debouncedSearch}
                                    onChange={handleSearch}
                                />
                            </div>
                            {debouncedSearch && (
                                <Badge variant="secondary" className="hidden sm:inline-flex bg-blue-500/10 text-blue-600 border-none px-2 py-0.5">
                                    {employees.length} kết quả
                                </Badge>
                            )}
                        </div>
                    }
                    filter={
                        <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                            <SheetTrigger className="h-9 px-3 gap-2 border border-muted-foreground/20 hover:bg-muted/50 rounded-lg transition-all duration-200 flex items-center">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="hidden sm:inline text-sm font-medium">Bộ lọc</span>
                                {activePills.length > 0 && (
                                    <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-[10px]">
                                        {activePills.length}
                                    </Badge>
                                )}
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col h-full border-l border-border/40 shadow-2xl">
                                <SheetHeader className="p-4 border-b border-border/50 bg-muted/20">
                                    <SheetTitle className="text-base font-semibold flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-primary" />
                                        Bộ lọc nâng cao
                                    </SheetTitle>
                                    <SheetDescription>
                                        Tuỳ chỉnh nhiều tiêu chí để tìm kiếm nhân sự chính xác.
                                    </SheetDescription>
                                </SheetHeader>
                                
                                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                    {/* --- Phân nhóm 1: Cơ cấu tổ chức --- */}
                                    <div className="pt-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-3.5 w-1 bg-blue-600 rounded-full" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">Cơ cấu tổ chức</span>
                                        </div>
                                    </div>

                                    {/* Công ty */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Công ty</Label>
                                        <Select value={companyFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setCompanyFilter(v); setFactoryFilter(""); setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả công ty" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả công ty</SelectItem>
                                                {companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Nhà máy */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Factory className="h-3.5 w-3.5" /> Nhà máy</Label>
                                        <Select value={factoryFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setFactoryFilter(v); setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả nhà máy" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả nhà máy</SelectItem>
                                                {factories.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Khối */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><GitFork className="h-3.5 w-3.5" /> Khối</Label>
                                        <Select value={divisionFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setDivisionFilter(v); setDepartmentFilter(""); setSectionFilter(""); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả khối" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả khối</SelectItem>
                                                {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Phòng ban */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Phòng ban</Label>
                                        <Select value={departmentFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setDepartmentFilter(v); setSectionFilter(""); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả phòng ban" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả phòng ban</SelectItem>
                                                {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Bộ phận */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Bộ phận</Label>
                                        <Select value={sectionFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setSectionFilter(v); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả bộ phận" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả bộ phận</SelectItem>
                                                {sections.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* --- Phân nhóm 2: Thông tin hành chính --- */}
                                    <div className="pt-4 border-t border-border/50">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-3.5 w-1 bg-green-600 rounded-full" />
                                            <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">Thông tin cá nhân</span>
                                        </div>
                                    </div>

                                    {/* Chức vụ */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Chức vụ</Label>
                                        <Select value={jobTitleFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setJobTitleFilter(v); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả chức vụ" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả chức vụ</SelectItem>
                                                {jobTitles.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Trạng thái */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Badge variant="outline" className="h-3.5 w-3.5 p-0 border-none"><Clock className="h-3.5 w-3.5" /></Badge> Trạng thái</Label>
                                        <Select value={statusFilter || "ALL"} onValueChange={(val) => { const v = val === "ALL" ? "" : val; setStatusFilter(v); }}>
                                            <SelectTrigger className="h-9 rounded-lg hover:bg-muted/30 transition-colors"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                                                <SelectItem value="PROBATION">Thử việc</SelectItem>
                                                <SelectItem value="OFFICIAL">Chính thức</SelectItem>
                                                <SelectItem value="SEASONAL">Thời vụ</SelectItem>
                                                <SelectItem value="RESIGNED">Đã nghỉ việc</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Ngày sinh */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Ngày sinh</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="date" value={dobFrom} onChange={(e) => setDobFrom(e.target.value)} className="h-9 rounded-lg text-sm bg-muted/20" />
                                            <Input type="date" value={dobTo} onChange={(e) => setDobTo(e.target.value)} className="h-9 rounded-lg text-sm bg-muted/20" />
                                        </div>
                                    </div>

                                    {/* Ngày vào làm */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Ngày vào làm</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="date" value={joinedFrom} onChange={(e) => setJoinedFrom(e.target.value)} className="h-9 rounded-lg text-sm bg-muted/20" />
                                            <Input type="date" value={joinedTo} onChange={(e) => setJoinedTo(e.target.value)} className="h-9 rounded-lg text-sm bg-muted/20" />
                                        </div>
                                    </div>
                                </div>

                                <SheetFooter className="p-4 border-t border-border/50 bg-muted/10 flex items-center gap-2 flex-row sm:justify-end">
                                    <Button variant="ghost" size="sm" className="h-9 flex-1 rounded-lg border border-border/30 hover:bg-destructive/10 text-destructive hover:text-destructive"
                                        onClick={() => {
                                            setCompanyFilter(""); setFactoryFilter(""); setDivisionFilter(""); setDepartmentFilter(""); setSectionFilter(""); setJobTitleFilter(""); setStatusFilter(""); setDobFrom(""); setDobTo(""); setJoinedFrom(""); setJoinedTo("");
                                        }}
                                    >
                                        Đặt lại
                                    </Button>
                                    <Button size="sm" className="h-9 flex-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-medium" onClick={() => setIsFilterDrawerOpen(false)}>
                                        Áp dụng
                                    </Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    }
                >
                    <div className="flex items-center gap-2">
                            <>
                                {/* View mode toggle */}
                                <div className="flex items-center border rounded-lg p-0.5 bg-muted/50 h-9">
                                    <Button
                                        variant={viewMode === "list" ? "secondary" : "ghost"}
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setViewMode("list")}
                                        title="Dạng danh sách"
                                    >
                                        <LayoutList className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        onClick={() => setViewMode("grid")}
                                        title="Dạng lưới"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Button asChild className="h-9 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 px-5 rounded-lg font-semibold">
                                    <Link href="/employees/new">
                                        <Plus className="mr-2 h-4 w-4" /> Thêm mới
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="h-9 bg-white/80 backdrop-blur-sm border-border/50 hover:bg-slate-100 transition-all rounded-lg shadow-sm gap-2">
                                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-sm">Tùy chọn</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px] border-border shadow-lg">
                                        <PermissionGate permission="EXPORT_DATA">
                                            <DropdownMenuItem onClick={handleExport} disabled={exportMutation.isPending} className="py-2.5 cursor-pointer">
                                                <FileDown className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>Xuất dữ liệu Excel</span>
                                            </DropdownMenuItem>
                                        </PermissionGate>
                                        <PermissionGate permission="IMPORT_DATA">
                                            <DropdownMenuItem onClick={() => setIsImportOpen(true)} className="py-2.5 cursor-pointer">
                                                <Upload className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                <span>Nhập dữ liệu Excel</span>
                                            </DropdownMenuItem>
                                        </PermissionGate>
                                        {isAdmin && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setIsColumnConfigOpen(true)} className="py-2.5 cursor-pointer">
                                                    <Columns3 className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    <span>Sắp xếp cột</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                    </div>
                </PageHeader>
            </div>

            {/* Content */}
            {viewMode === "list" ? (
                <div 
                    ref={parentRef}
                    className="rounded-xl border border-border bg-card shadow-sm flex-1 overflow-auto animate-in fade-in slide-in-from-bottom-8 duration-700"
                >
                    <div className="relative w-max min-w-full">
                        {/* Header */}
                        <div className="sticky top-0 z-30 flex bg-background/95 backdrop-blur shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
                            <div className="w-[44px] h-11 flex items-center justify-center border-r border-border/40 bg-background shrink-0">
                                <Checkbox
                                    checked={employees.length > 0 && selectedSet.size === employees.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    className="mt-0.5"
                                />
                            </div>
                            {visibleColumns.map((col) => {
                                const colKey = col.key;
                                return (
                                    <div
                                        key={colKey}
                                        style={{
                                            width: `var(--col-w-${colKey}, 150px)`,
                                            minWidth: `var(--col-w-${colKey}, 60px)`,
                                            maxWidth: `var(--col-w-${colKey}, 500px)`
                                        }}
                                        className="h-11 px-3 flex items-center overflow-hidden cursor-pointer hover:text-foreground transition-colors group relative select-none border-r border-border/40 last:border-r-0 bg-background shrink-0 text-muted-foreground text-[13px] font-semibold tracking-wide"
                                        onClick={() => toggleSort(colKey)}
                                    >
                                        <div className="flex items-center min-w-0 flex-1 pr-4">
                                            <span className="truncate flex-1" title={col.label}>{col.label}</span>
                                            <SortIcon field={colKey} />
                                        </div>
                                        <span
                                            className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                const target = e.currentTarget as HTMLElement;
                                                const th = target.parentElement!;
                                                const startX = e.clientX;
                                                const startW = th.getBoundingClientRect().width;
                                                const onMove = (ev: MouseEvent) => {
                                                    const newW = Math.max(60, startW + ev.clientX - startX);
                                                    document.documentElement.style.setProperty(`--col-w-${colKey}`, `${newW}px`);
                                                };
                                                const onUp = (ev: MouseEvent) => {
                                                    window.removeEventListener('mousemove', onMove);
                                                    window.removeEventListener('mouseup', onUp);
                                                    const finalW = Math.max(60, startW + ev.clientX - startX);
                                                    saveColWidth(colKey, finalW);
                                                };
                                                window.addEventListener('mousemove', onMove);
                                                window.addEventListener('mouseup', onUp);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="w-[3px] h-5 bg-border rounded-full hover:bg-blue-500 transition-colors" />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Body */}
                        <div 
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center py-10 text-muted-foreground">Đang tải dữ liệu...</div>
                            ) : employees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/60">
                                    <Users className="h-12 w-12 mb-3 text-muted-foreground/40" />
                                    <p className="text-base font-medium text-muted-foreground">Chưa có nhân viên nào</p>
                                    <p className="text-sm mt-1">Bấm "Thêm mới" để bắt đầu.</p>
                                </div>
                            ) : (
                                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const employee = employees[virtualRow.index];
                                    const isSelected = selectedSet.has(employee.id);
                                    return (
                                        <div
                                            key={virtualRow.key}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualRow.size}px`,
                                                transform: `translateY(${virtualRow.start}px)`,
                                            }}
                                            className={cn(
                                                "flex border-b border-border/60 hover:bg-muted/40 transition-colors duration-150 group",
                                                isSelected && "bg-primary/5"
                                            )}
                                        >
                                            <div 
                                                className="w-[44px] flex items-center justify-center border-r border-border/20 shrink-0 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectRow(employee.id, !isSelected);
                                                }}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleSelectRow(employee.id, checked as boolean)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            {visibleColumns.map((col) => (
                                                <div
                                                    key={col.key}
                                                    style={{
                                                        width: `var(--col-w-${col.key}, 150px)`,
                                                        minWidth: `var(--col-w-${col.key}, 60px)`,
                                                        maxWidth: `var(--col-w-${col.key}, 500px)`
                                                    }}
                                                    className="px-3 flex items-center overflow-hidden shrink-0 border-r border-border/20 last:border-r-0"
                                                    onDoubleClick={() => handleDoubleClickCell(employee.id, col.key, (employee as any)[col.key])}
                                                >
                                                    {renderCell(employee, col.key, editingCell, editValue, setEditValue, handleEditSave, handleEditCancel)}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-auto rounded-xl border border-border bg-card shadow-sm p-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-[200px] rounded-xl bg-muted animate-pulse" />
                            ))
                        ) : employees.length === 0 ? (
                            <div className="col-span-full h-40 flex flex-col items-center justify-center text-muted-foreground/60">
                                <Users className="h-12 w-12 mb-3 text-muted-foreground/40" />
                                <p className="text-base font-medium text-muted-foreground">Chưa có nhân viên nào</p>
                                <p className="text-sm mt-1">Bấm "Thêm mới" để bắt đầu.</p>
                            </div>
                        ) : (
                            employees.map((employee, index) => (
                                <EmployeeCard
                                    key={employee.id}
                                    employee={employee}
                                    onDelete={handleDelete}
                                    delay={index * 50}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto bg-card p-2 rounded-xl border border-border shadow-sm">
                {selectedRows.length > 0 && viewMode === "list" && (
                    <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                        <span className="text-sm text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm">Đã chọn ({selectedRows.length})</span>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedRows([])} className="h-8 rounded-md text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 px-3">
                            Bỏ chọn
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="shadow-sm hover:shadow h-8 rounded-md bg-rose-500 hover:bg-rose-600">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Xóa hàng loạt
                        </Button>
                    </div>
                )}
                <div className={selectedRows.length > 0 ? "" : "ml-auto"}>
                    <PaginationControl
                        currentPage={page}
                        totalPages={data?.meta?.totalPages || 0}
                        pageSize={limit}
                        totalCount={cachedStats.total || data?.meta?.total || 0}
                        filteredCount={debouncedSearch ? (data?.meta?.total ?? employees.length) : undefined}
                        onPageChange={(newPage) => setPage(newPage)}
                        onPageSizeChange={(newLimit) => {
                            setLimit(newLimit);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Column Config Dialog (admin only) */}
            <ColumnConfigDialog
                open={isColumnConfigOpen}
                onOpenChange={setIsColumnConfigOpen}
                moduleKey="employees"
                allColumns={allColumns}
                defaultColumns={EMPLOYEE_DEFAULT_COLUMNS}
            />

            <ImportEmployeeDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSuccess={() => refetch()}
            />

        </div>
    );
}
