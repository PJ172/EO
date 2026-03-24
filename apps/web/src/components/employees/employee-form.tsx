"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCreateEmployee, useUpdateEmployee, Employee, useJobTitles, useEmployees, useUploadAvatar } from "@/services/employee.service";
import { usePositions } from "@/services/position.service";
import { API_BASE_URL } from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Camera, User, CreditCard, Building2, Shield, FileText, GraduationCap, Loader2,
    Users, Plus, Trash2, FolderOpen, Cake, History, Star, ArrowLeft, Phone, MapPin
} from "lucide-react";
import Link from "next/link";
import { EmploymentEventsTab } from "./employment-events-tab";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useDepartments } from "@/services/department.service";
import { useCompanies } from "@/services/company.service";
import { useDivisions } from "@/services/division.service";
import { useSections } from "@/services/section.service";
import { useFactories } from "@/services/factory.service";
import { employeeSchema, EmployeeFormData } from "@/lib/validations/schemas";

import { cn, formatPhoneNumber, capitalizeWords, getAvatarVariant } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface EmployeeFormProps {
    initialData?: Employee & {
        contracts?: Array<{
            id: string;
            contractNumber: string;
            contractType: string;
            startDate: string;
            endDate?: string;
            note?: string;
        }>;
    };
    isEdit?: boolean;
}

const GENDER_OPTIONS = [
    { value: "MALE", label: "Nam" },
    { value: "FEMALE", label: "Nữ" },
    { value: "OTHER", label: "Khác" },
];

const MARITAL_STATUS_OPTIONS = [
    { value: "SINGLE", label: "Độc thân" },
    { value: "MARRIED", label: "Đã kết hôn" },
    { value: "DIVORCED", label: "Ly hôn" },
];

const RELATIONSHIP_OPTIONS = [
    { value: "WIFE", label: "Vợ" },
    { value: "HUSBAND", label: "Chồng" },
    { value: "FATHER", label: "Cha" },
    { value: "MOTHER", label: "Mẹ" },
    { value: "CHILD", label: "Con" },
    { value: "BROTHER", label: "Anh" },
    { value: "SISTER", label: "Chị" },
];

const CONTRACT_OPTIONS = [
    { value: "PROBATION", label: "Thử việc" },
    { value: "INDEFINITE_TERM", label: "Không thời hạn" },
    { value: "SEASONAL", label: "Thời vụ" },
    { value: "ONE_YEAR", label: "1 Năm" },
    { value: "TWO_YEARS", label: "2 Năm" },
    { value: "THREE_YEARS", label: "3 Năm" },
];

const EDUCATION_OPTIONS = [
    { value: "PRIMARY", label: "Tiểu học" },
    { value: "SECONDARY", label: "THCS" },
    { value: "HIGH_SCHOOL", label: "THPT" },
    { value: "VOCATIONAL", label: "Trung cấp" },
    { value: "COLLEGE", label: "Cao đẳng" },
    { value: "UNIVERSITY", label: "Đại học" },
    { value: "MASTER", label: "Thạc sĩ" },
    { value: "DOCTOR", label: "Tiến sĩ" },
    { value: "GRADE_12_12", label: "12/12" },
    { value: "GRADE_11_12", label: "11/12" },
    { value: "GRADE_10_12", label: "10/12" },
    { value: "GRADE_9_12", label: "9/12" },
    { value: "GRADE_8_12", label: "8/12" },
    { value: "GRADE_7_12", label: "7/12" },
    { value: "GRADE_6_12", label: "6/12" },
    { value: "GRADE_5_12", label: "5/12" },
    { value: "GRADE_4_12", label: "4/12" },
    { value: "GRADE_3_12", label: "3/12" },
    { value: "GRADE_2_12", label: "2/12" },
    { value: "GRADE_1_12", label: "1/12" },
];

const getErrorMessages = (errors: any, prefix = ""): string[] => {
    let messages: string[] = [];
    if (!errors) return messages;
    for (const key in errors) {
        const error = errors[key];
        if (!error) continue;

        let formattedKey = key;
        if (key === "familyMembers") formattedKey = "Gia đình";
        if (key === "contracts") formattedKey = "Hợp đồng";
        if (key === "fullName") formattedKey = "Họ và tên";
        if (key === "dob") formattedKey = "Ngày sinh";

        const currentPath = prefix ? `${prefix} -> ${formattedKey}` : formattedKey;
        
        if (typeof error === "object" && !error.message) {
            messages = messages.concat(getErrorMessages(error, currentPath));
        } else if (error.message) {
            // If it's an index, format as "Dòng X"
            const label = currentPath.replace(/\.(\d+)/g, ' (Dòng $1)');
            messages.push(`${label}: ${error.message}`);
        }
    }
    return messages;
};

export function EmployeeForm({ initialData, isEdit = false }: EmployeeFormProps) {
    const router = useRouter();
    const createEmployee = useCreateEmployee();
    const updateEmployee = useUpdateEmployee();
    const uploadAvatarMutation = useUploadAvatar();

    // Fetch options
    const { data: jobTitlesData } = useJobTitles();
    const jobTitles = jobTitlesData?.data || [];

    const { data: companiesData } = useCompanies({ limit: 500, excludeFromFilters: "false" } as any);
    const companies = companiesData?.data || [];

    const { data: divisionsData } = useDivisions({ limit: 500, excludeFromFilters: "false" } as any);
    const divisions = divisionsData?.data || [];

    const { data: departmentsData } = useDepartments({ limit: 1000, excludeFromFilters: "false" } as any);
    const departments = departmentsData?.data || [];

    const { data: sectionsData } = useSections({ limit: 1000, excludeFromFilters: "false" } as any);
    const sections = sectionsData?.data || [];

    const { data: positionsData } = usePositions({ isActive: true });
    const positions = positionsData || [];

    const { data: employeesData } = useEmployees({ limit: 500 }); // Needed for managers list
    const employees = (employeesData as any)?.data || [];

    const { data: factoriesData } = useFactories({ limit: 500, excludeFromFilters: "false" } as any);
    const factories = factoriesData?.data || [];

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const resolvedAvatarPath = initialData?.avatar ? getAvatarVariant(initialData.avatar, 'medium') : null;
    const [avatarPreview, setAvatarPreview] = useState<string | null>(resolvedAvatarPath ? (resolvedAvatarPath.startsWith('http') || resolvedAvatarPath.startsWith('data:') ? resolvedAvatarPath : `${API_BASE_URL.replace('/api/v1', '')}${resolvedAvatarPath}`) : null);
    const [companyId, setCompanyId] = useState<string>(initialData?.companyId || "none");

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema) as any,
        defaultValues: initialData ? {
            employeeCode: initialData.employeeCode || "",
            fullName: initialData.fullName || "",
            email: initialData.emailCompany || "",
            phone: initialData.phone || "",
            companyId: initialData.companyId || "",
            departmentId: initialData.departmentId || "",
            sectionId: initialData.sectionId || "",
            jobTitleId: initialData.jobTitleId || "",
            positionId: (initialData as any).positionId || "",
            managerEmployeeId: initialData.managerEmployeeId || "",
            factoryId: initialData.factoryId || "",
            divisionId: initialData.divisionId || "",
            employmentStatus: initialData.employmentStatus,
            joinedAt: initialData.joinedAt ? new Date(initialData.joinedAt).toISOString().split('T')[0] : undefined,
            dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : undefined,
            // New fields
            gender: initialData.gender || undefined,
            maritalStatus: initialData.maritalStatus || undefined,
            permanentAddress: initialData.permanentAddress || "",
            temporaryAddress: initialData.temporaryAddress || "",
            birthPlace: initialData.birthPlace || "",
            ethnicity: initialData.ethnicity || "",
            religion: initialData.religion || "",
            personalEmail: initialData.personalEmail || "",
            note: initialData.note || "",
            // Records
            nationalId: initialData.nationalId || "",
            placeOfIssue: initialData.placeOfIssue || "",
            dateOfIssue: initialData.dateOfIssue ? new Date(initialData.dateOfIssue).toISOString().split('T')[0] : undefined,
            bankName: initialData.bankName || "",
            bankBranch: initialData.bankBranch || "",
            bankAccountNo: initialData.bankAccountNo || "",
            socialInsuranceNo: initialData.socialInsuranceNo || "",
            healthInsuranceNo: initialData.healthInsuranceNo || "",
            taxCode: initialData.taxCode || "",
            // Uniform
            recordCode: initialData.recordCode || "",
            salaryLevel: initialData.salaryLevel || "",
            accessCardId: initialData.accessCardId || "",
            accessCardStatus: initialData.accessCardStatus || "",
            uniformPantsSize: initialData.uniformPantsSize || "",
            uniformShirtSize: initialData.uniformShirtSize || "",
            shoeSize: initialData.shoeSize || "",
            documentFile: initialData.documentFile || "",
            emergencyPhone: initialData.emergencyPhone || "",
            emergencyContactName: initialData.emergencyContactName || "",
            referrer: initialData.referrer || "",
            showOnOrgChart: initialData.showOnOrgChart ?? false,
            // Contract Status
            contractNumber: initialData.contractNumber || "",
            contractType: (initialData.contractType as any) || undefined,
            contractStartDate: initialData.contractStartDate ? new Date(initialData.contractStartDate).toISOString().split('T')[0] : undefined,
            contractEndDate: initialData.contractEndDate ? new Date(initialData.contractEndDate).toISOString().split('T')[0] : undefined,
            // Education
            education: initialData.education || undefined,
            major: initialData.major || "",
            school: initialData.school || "",
            graduationYear: initialData.graduationYear || undefined,
            // Relations
            contracts: (initialData.contracts as any)?.map((c: any) => ({
                contractNumber: c.contractNumber,
                contractType: c.contractType as any,
                startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
                endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : '',
                note: c.note || '',
            })) || [],
            familyMembers: initialData.familyMembers?.map(f => ({
                name: f.name,
                relationship: f.relationship as any,
                dob: f.dob ? new Date(f.dob).toISOString().split('T')[0] : '',
                phoneNumber: f.phoneNumber || '',
                job: f.job || '',
                note: f.note || '',
            })) || [],
        } : {
            employmentStatus: "PROBATION",
            joinedAt: new Date().toISOString().split('T')[0],
            contracts: [],
            familyMembers: [],
            showOnOrgChart: false,
        },
    });

    const { fields: contractFields, append: appendContract, remove: removeContract } = useFieldArray({
        control,
        name: "contracts",
    });

    const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({
        control,
        name: "familyMembers",
    });

    const newestContractIndex = useMemo(() => {
        const contracts = getValues("contracts") || [];
        if (contracts.length === 0) return -1;

        let maxIndex = 0;
        let maxDate = new Date(contracts[0]?.startDate || 0);

        contracts.forEach((c, index) => {
            const date = new Date(c?.startDate || 0);
            if (date > maxDate) {
                maxDate = date;
                maxIndex = index;
            }
        });
        return maxIndex;
    }, [watch("contracts")]); // Re-calculate when contracts change

    const calculateAge = (dob: string | undefined) => {
        if (!dob) return "";
        const birthDate = new Date(dob);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        if (days < 0) {
            months--;
            days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        return `${years} tuổi ${months} tháng ${days} ngày`;
    };

    const isBirthday = useMemo(() => {
        if (!initialData?.dob) return false;
        const dob = new Date(initialData.dob);
        const today = new Date();
        return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
    }, [initialData?.dob]);

    const sortedDepartments = useMemo(() => {
        if (!departments) return [];
        return [...departments].sort((a, b) => a.name.localeCompare(b.name));
    }, [departments]);

    const companyOptions = useMemo(() => {
        if (!companies) return [];
        return [...companies]
            .map(c => ({ ...c, label: c.status === 'INACTIVE' ? `${c.name} (Ngừng HĐ)` : c.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [companies]);

    const divisionsOptions = useMemo(() => {
        if (!divisions) return [];
        // Solution 2: Show ALL divisions regardless of selected factory/company.
        // Same logic as factoryOptions — employees can belong to any division.
        return [...divisions]
            .map(d => ({ ...d, label: d.status === 'INACTIVE' ? `${d.name} (Ngừng HĐ)` : d.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [divisions]);

    useEffect(() => {
        if (companyOptions.length === 1 && companyId === "none") {
            setCompanyId(companyOptions[0].id);
        }
        // Sync state to form value
        setValue("companyId", companyId === "none" ? "" : companyId);
    }, [companyOptions, companyId, setValue]);

    const factoryOptions = useMemo(() => {
        if (!factories) return [];
        // Solution 2: Show ALL factories across all companies.
        // Employees can work at any factory regardless of their assigned company.
        // Company name is appended to distinguish same-named factories from different companies.
        return [...factories]
            .map(f => ({
                ...f,
                label: f.status === 'INACTIVE'
                    ? `${f.name} (Ngừng HĐ)`
                    : f.company?.name
                        ? `${f.name} [${f.company.name}]`
                        : f.name,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [factories]);

    const departmentOptions = useMemo(() => {
        if (!departments) return [];

        const selectedDivisionId = watch("divisionId");

        // Cascade: if division selected, show only departments of that division
        // Solution 2: otherwise show ALL departments (no companyId/factoryId filter)
        const filtered = (selectedDivisionId && selectedDivisionId !== "none")
            ? departments.filter(d => d.divisionId === selectedDivisionId || d.id === watch("departmentId"))
            : departments;

        return filtered
            .map(d => ({ ...d, label: d.status === 'INACTIVE' ? `${d.name} (Ngừng HĐ)` : d.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [departments, watch("divisionId"), watch("departmentId")]);

    const sectionOptions = useMemo(() => {
        if (!sections) return [];

        const selectedDeptId = watch("departmentId");

        // Cascade: if department selected, show only sections of that department
        // Solution 2: otherwise show ALL sections (no companyId filter)
        const filtered = (selectedDeptId && selectedDeptId !== "none")
            ? sections.filter(s => s.departmentId === selectedDeptId || s.id === watch("sectionId"))
            : sections;

        return filtered
            .map(s => ({ ...s, label: s.status === 'INACTIVE' ? `${s.name} (Ngừng HĐ)` : s.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [sections, watch("departmentId"), watch("sectionId")]);

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            // Normalize data to Title Case
            const normalizedData = {
                ...data,
                fullName: capitalizeWords(data.fullName),
                ethnicity: data.ethnicity ? capitalizeWords(data.ethnicity) : "",
                religion: data.religion ? capitalizeWords(data.religion) : "",
                birthPlace: data.birthPlace ? capitalizeWords(data.birthPlace) : "",
                permanentAddress: data.permanentAddress ? capitalizeWords(data.permanentAddress) : "",
                temporaryAddress: data.temporaryAddress ? capitalizeWords(data.temporaryAddress) : "",
            };

            const { email, ...payload } = normalizedData;
            // Clean up empty optional fields
            const cleanPayload = {
                ...payload,
                companyId: companyId === "none" ? "" : companyId,
                emailCompany: email,
                contractType: payload.contractType || undefined,
            };

            // Remove "none" string from IDs
            const fieldsToClean = ["companyId", "factoryId", "divisionId", "departmentId", "sectionId", "jobTitleId", "positionId", "managerEmployeeId"];
            fieldsToClean.forEach(field => {
                if ((cleanPayload as any)[field] === "none") {
                    (cleanPayload as any)[field] = "";
                }
            });

            // Clean empty dates to null
            const dateFields = ["dob", "joinedAt", "resignedAt", "dateOfIssue", "contractStartDate", "contractEndDate"];
            dateFields.forEach(f => {
                if ((cleanPayload as any)[f] === "") {
                    (cleanPayload as any)[f] = null;
                }
            });

            if (cleanPayload.contracts) {
                cleanPayload.contracts = (cleanPayload.contracts as any).map((c: any) => ({
                    ...c,
                    startDate: c.startDate === "" ? null : c.startDate,
                    endDate: c.endDate === "" ? null : c.endDate,
                }));
            }
            if (cleanPayload.familyMembers) {
                cleanPayload.familyMembers = (cleanPayload.familyMembers as any).map((f: any) => ({
                    ...f,
                    dob: f.dob === "" ? null : f.dob,
                }));
            }

            if (isEdit && initialData) {
                await updateEmployee.mutateAsync({
                    id: initialData.id,
                    ...cleanPayload,
                } as any);
                if (avatarFile) {
                    await uploadAvatarMutation.mutateAsync({ id: initialData.id, file: avatarFile });
                }
                toast.success("Cập nhật thành công");
                // router.push("/employees"); // <--- Vô hiệu hóa chuyển trang theo yêu cầu
            } else {
                const newEmployee = await createEmployee.mutateAsync({
                    ...cleanPayload,
                } as any);
                if (avatarFile && newEmployee?.id) {
                    try {
                        await uploadAvatarMutation.mutateAsync({ id: newEmployee.id, file: avatarFile });
                    } catch (err) {
                        console.error("Lỗi upload avatar:", err);
                    }
                }
                toast.success("Tạo nhân viên thành công");
                router.push("/employees");
            }
        } catch (error: any) {
            console.error(error);
            const message = error?.response?.data?.message;
            const formattedMessage = Array.isArray(message) && message.length > 0 
                ? message.join(", ") 
                : (typeof message === "string" && message ? message : "Đã có lỗi xảy ra trên máy chủ");
            toast.error(formattedMessage);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Nếu đang edit và muốn lưu dính liền luôn (như code cũ) thì giữ logic này, 
            // hoặc để submit form mới lưu cũng được. User yêu cầu "chưa có khả năng thêm" 
            // nên ta cho phép chọn ảnh và lưu cùng lúc submit.
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit, (errors) => {
            const errorMessages = getErrorMessages(errors).join(", ");
            toast.error(`Vui lòng kiểm tra lại: ${errorMessages}`, { duration: 5000 });
        })} className="flex flex-col gap-2 relative">

            {/* ═══ HEADER BANNER ═══ */}
            <div className="relative rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md border border-border/50 shadow-sm transition-all hover:shadow-md">
                {/* Gradient Backgrounds */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-500/10 to-transparent" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-amber-200/20 to-transparent rounded-full blur-3xl" />

                <div className="relative p-3 md:px-4 md:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 sm:gap-6">
                        {/* Back button */}
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-background/50 hover:bg-background/80 shadow-sm border-slate-200/60 dark:border-slate-800/60" type="button" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>

                        {/* Avatar Upload */}
                        <div className="relative group shrink-0">
                            <div className="ring-4 ring-background/80 rounded-full shadow-md transition-transform group-hover:scale-105 duration-300">
                                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-white/20 aspect-square">
                                    <AvatarImage src={avatarPreview || undefined} className="object-cover w-full h-full" />
                                    <AvatarFallback className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                                        {(watch("fullName") || "?").substring(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                        </div>

                        {/* Text & Roles */}
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                {isEdit ? `Chỉnh sửa: ${initialData?.fullName || ''}` : "Thêm Nhân Viên Mới"}
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground mt-1 tracking-wide">
                                {isEdit ? watch("employeeCode") || '' : "Hoàn thiện thông tin hồ sơ nhân sự"}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats or Actions on right for Desktop */}
                    <div className="hidden md:flex flex-col items-end gap-1.5">
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()} className="h-9 px-4 rounded-full shadow-sm text-sm">
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="h-9 px-6 rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEdit ? "Cập nhật" : "Tạo mới"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {/* ═══ TABS & CONTENT ═══ */}
            <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden bg-card/50 p-0">
                <CardContent className="p-2 sm:p-3 md:p-2">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-6 h-10 mb-0 bg-muted/60 p-1 rounded-lg">
                            <TabsTrigger value="basic" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><User className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cơ bản</span></TabsTrigger>
                            <TabsTrigger value="records" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">Hồ sơ</span></TabsTrigger>
                            <TabsTrigger value="family" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Gia đình</span></TabsTrigger>
                            <TabsTrigger value="contracts" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><Building2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Hợp đồng</span></TabsTrigger>
                            <TabsTrigger value="education" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><GraduationCap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Học vấn</span></TabsTrigger>
                            {isEdit && <TabsTrigger value="events" className="gap-1.5 text-sm sm:text-sm font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800"><History className="h-3.5 w-3.5" /><span className="hidden sm:inline">Biến động</span></TabsTrigger>}
                        </TabsList>

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-2 pt-0 outline-none">

                            {/* ═══ SECTION 1: Thông tin cá nhân ═══ */}
                            <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-transparent border-b border-blue-100 dark:border-blue-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                                        <User className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 tracking-wide">Thông tin Cá nhân</h3>
                                </div>
                                <div className="p-2 grid grid-cols-1 md:grid-cols-6 gap-x-2 gap-y-2">
                                    {/* Row 1: Mã NV, Họ tên, Ngày sinh, Tuổi, Sinh nhật */}
                                    <div className="space-y-1.5">
                                        <Label required={true} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mã nhân viên</Label>
                                        <Input {...register("employeeCode")} placeholder=" " disabled={isEdit} className="h- text-sm border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-400/20" />
                                        {errors.employeeCode && <p className="text-[11px] text-destructive font-medium">{errors.employeeCode.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required={true} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Họ và tên</Label>
                                        <Input
                                            {...register("fullName")}
                                            onBlur={(e) => {
                                                setValue("fullName", capitalizeWords(e.target.value), { shouldValidate: true });
                                                register("fullName").onBlur(e);
                                            }}
                                            placeholder=" "
                                            className="h-9 text-sm capitalize border-slate-200 dark:border-slate-700 focus:border-blue-400 focus:ring-blue-400/20"
                                        />
                                        {errors.fullName && <p className="text-[11px] text-destructive font-medium">{errors.fullName.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày sinh</Label>
                                        <DatePicker value={watch("dob")} onChange={(date) => setValue("dob", date ? format(date, "yyyy-MM-dd") : "")} minYear={1940} maxYear={2010} />
                                    </div>
                                    {/* Tuổi (auto) */}
                                    {(() => {
                                        const dob = watch("dob");
                                        if (!dob) return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tuổi</Label>
                                                <Input value="—" disabled className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50 text-center font-medium" />
                                            </div>
                                        );
                                        const getVnDate = (d: string | Date | undefined) => {
                                            if (!d) return new Date();
                                            const dateObj = typeof d === 'string' ? new Date(d) : d;
                                            const parts = new Intl.DateTimeFormat('en-US', {
                                                timeZone: 'Asia/Ho_Chi_Minh',
                                                year: 'numeric', month: 'numeric', day: 'numeric',
                                            }).formatToParts(dateObj);
                                            const p = parts.reduce((acc, curr) => ({ ...acc, [curr.type]: curr.value }), {} as Record<string, string>);
                                            return new Date(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day));
                                        };
                                        const birthDate = getVnDate(dob);
                                        const today = getVnDate(new Date());
                                        let age = today.getFullYear() - birthDate.getFullYear();
                                        const m = today.getMonth() - birthDate.getMonth();
                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                                        return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tuổi</Label>
                                                <Input value={age} disabled className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50 text-center font-semibold text-blue-600 dark:text-blue-400" />
                                            </div>
                                        );
                                    })()}
                                    {/* Sinh nhật (auto) */}
                                    {(() => {
                                        const dob = watch("dob");
                                        if (!dob) return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sinh nhật</Label>
                                                <Input value="—" disabled className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50 text-center" />
                                            </div>
                                        );
                                        const getVnDate = (d: string | Date | undefined) => {
                                            if (!d) return new Date();
                                            const dateObj = typeof d === 'string' ? new Date(d) : d;
                                            const parts = new Intl.DateTimeFormat('en-US', {
                                                timeZone: 'Asia/Ho_Chi_Minh',
                                                year: 'numeric', month: 'numeric', day: 'numeric',
                                            }).formatToParts(dateObj);
                                            const p = parts.reduce((acc, curr) => ({ ...acc, [curr.type]: curr.value }), {} as Record<string, string>);
                                            return new Date(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day));
                                        };
                                        const birthDate = getVnDate(dob);
                                        const today = getVnDate(new Date());

                                        let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                                        if (nextBirthday.getTime() < today.getTime()) {
                                            nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
                                        }

                                        const utc1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                                        const utc2 = Date.UTC(nextBirthday.getFullYear(), nextBirthday.getMonth(), nextBirthday.getDate());
                                        const daysLeft = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

                                        let cls = "bg-slate-50 dark:bg-slate-800/50 text-muted-foreground";
                                        let label = `Còn ${daysLeft} ngày`;
                                        if (daysLeft === 0) { cls = "bg-red-500 text-white font-bold"; label = "🎂 Hôm nay!"; }
                                        else if (daysLeft <= 3) { cls = "bg-red-500 text-white font-bold"; label = `🎂 Còn ${daysLeft} ngày`; }
                                        else if (daysLeft <= 15) { cls = "bg-amber-400 text-amber-900 font-semibold"; label = `Còn ${daysLeft} ngày`; }
                                        else if (daysLeft <= 30) { cls = "bg-blue-500 text-white font-medium"; label = `Còn ${daysLeft} ngày`; }
                                        return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sinh nhật</Label>
                                                <Input value={label} disabled className={`h-9 text-sm text-center disabled:opacity-100 ${cls}`} />
                                            </div>
                                        );
                                    })()}

                                    {/* Row 2: Giới tính, Hôn nhân, Dân tộc, Tôn giáo, Trạng thái */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Giới tính</Label>
                                        <Select value={watch("gender") || undefined} onValueChange={(val) => setValue("gender", val as any)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                            <SelectContent>
                                                {GENDER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hôn nhân</Label>
                                        <Select value={watch("maritalStatus") || undefined} onValueChange={(val) => setValue("maritalStatus", val as any)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                            <SelectContent>
                                                {MARITAL_STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dân tộc</Label>
                                        <Input {...register("ethnicity")} className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tôn giáo</Label>
                                        <Input {...register("religion")} className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label required={true} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</Label>
                                        <Select value={watch("employmentStatus")} onValueChange={(val) => setValue("employmentStatus", val as any)} disabled={isEdit}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PROBATION" className="text-sm">Thử việc</SelectItem>
                                                <SelectItem value="OFFICIAL" className="text-sm">Chính thức</SelectItem>
                                                <SelectItem value="SEASONAL" className="text-sm">Thời vụ</SelectItem>
                                                <SelectItem value="MATERNITY_LEAVE" className="text-sm">Thai sản</SelectItem>
                                                <SelectItem value="RESIGNED" className="text-sm">Đã nghỉ việc</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày vào làm</Label>
                                        <DatePicker value={watch("joinedAt")} onChange={(date) => setValue("joinedAt", date ? format(date, "yyyy-MM-dd") : "")} minYear={1990} maxYear={2100} />
                                    </div>
                                    {(() => {
                                        const joinedAt = watch("joinedAt");
                                        const resignationDate = initialData?.resignedAt ? new Date(initialData.resignedAt).toISOString().split('T')[0] : undefined;
                                        if (!joinedAt) return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Thâm niên</Label>
                                                <Input value="—" disabled className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50 text-center" />
                                            </div>
                                        );
                                        const start = new Date(joinedAt);
                                        const end = resignationDate ? new Date(resignationDate) : new Date();
                                        let years = end.getFullYear() - start.getFullYear();
                                        let months = end.getMonth() - start.getMonth();
                                        let days = end.getDate() - start.getDate();
                                        if (days < 0) { months--; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
                                        if (months < 0) { years--; months += 12; }
                                        return (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Thâm niên</Label>
                                                <Input value={`${years} năm ${months} tháng ${days} ngày`} disabled className="h-9 text-sm bg-slate-50 dark:bg-slate-800/50 text-center font-semibold text-violet-600 dark:text-violet-400" />
                                                {resignationDate && <p className="text-[10px] text-muted-foreground">*Đến {format(new Date(resignationDate), "dd/MM/yyyy")}</p>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* ═══ SECTION 2: Tổ chức ═══ */}
                            <div className="rounded-xl border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/30 to-white dark:from-violet-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-violet-500/10 to-transparent border-b border-violet-100 dark:border-violet-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm">
                                        <Building2 className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-400 tracking-wide">Thông tin Đơn vị</h3>
                                </div>
                                <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Công ty</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...companyOptions.map(c => ({ value: c.id, label: c.name }))]}
                                            value={companyId} onValueChange={(val) => setCompanyId(val === "none" ? "none" : val || "none")} placeholder="Chọn công ty" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nhà máy</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...factoryOptions.map(f => ({ value: f.id, label: f.name }))]}
                                            value={watch("factoryId") || "none"} onValueChange={(val) => setValue("factoryId", val === "none" ? "" : val || "")} placeholder="Chọn nhà máy" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Khối</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...divisionsOptions.map(d => ({ value: d.id, label: d.name }))]}
                                            value={watch("divisionId") || "none"} onValueChange={(val) => { setValue("divisionId", val === "none" ? "" : val || ""); setValue("departmentId", ""); setValue("sectionId", ""); }} placeholder="Chọn khối" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Phòng ban</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...departmentOptions.map(d => ({ value: d.id, label: d.name }))]}
                                            value={watch("departmentId") || "none"} onValueChange={(val) => { setValue("departmentId", val === "none" ? "" : val || ""); setValue("sectionId", ""); }} placeholder="Chọn phòng ban" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bộ phận</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...sectionOptions.map(s => ({ value: s.id, label: s.name }))]}
                                            value={watch("sectionId") || "none"} onValueChange={(val) => setValue("sectionId", val === "none" ? "" : val || "")} placeholder="Chọn bộ phận" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chức danh</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...(jobTitles?.map(jt => ({ value: jt.id, label: jt.name })) || [])]}
                                            value={watch("jobTitleId") || "none"} onValueChange={(val) => setValue("jobTitleId", val === "none" ? "" : val || "")} placeholder="Chọn chức danh" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Vị trí / Chức vụ</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...(positions?.map(p => ({ value: p.id, label: p.name })) || [])]}
                                            value={watch("positionId" as any) || "none"} onValueChange={(val) => setValue("positionId" as any, val === "none" ? "" : val || "")} placeholder="Chọn vị trí" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quản lý trực tiếp</Label>
                                        <Combobox options={[{ value: "none", label: "-- Chọn --" }, ...(employees?.filter((emp: any) => emp.id !== initialData?.id).map((emp: any) => ({ value: emp.id, label: `${capitalizeWords(emp.fullName)} (${emp.employeeCode})` })) || [])]}
                                            value={watch("managerEmployeeId") || "none"} onValueChange={(val) => setValue("managerEmployeeId", val === "none" ? "" : val || "")} placeholder="Chọn quản lý" />
                                    </div>
                                </div>
                            </div>

                            {/* ═══ SECTION 3: Liên lạc ═══ */}
                            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-emerald-100 dark:border-emerald-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                        <Phone className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">Thôn tin Liên lạc</h3>
                                </div>
                                <div className="p-2 grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số điện thoại</Label>
                                        <Input {...register("phone")} onBlur={(e) => setValue("phone", formatPhoneNumber(e.target.value))} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email công ty</Label>
                                        <Input type="email" {...register("email")} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Email cá nhân</Label>
                                        <Input type="email" {...register("personalEmail")} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">SĐT khẩn cấp</Label>
                                        <Input {...register("emergencyPhone")} onBlur={(e) => setValue("emergencyPhone", formatPhoneNumber(e.target.value))} placeholder="SĐT người thân" className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Người thân khẩn cấp</Label>
                                        <Input {...register("emergencyContactName")} placeholder="Người LH khẩn cấp" className="h-9 text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* ═══ SECTION 4: Địa chỉ & Ghi chú ═══ */}
                            <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-100 dark:border-amber-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
                                        <MapPin className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-wide">Thông tin Địa chỉ</h3>
                                </div>
                                <div className="p-2 grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nơi sinh</Label>
                                        <Input {...register("birthPlace")} className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Địa chỉ thường trú</Label>
                                        <Input {...register("permanentAddress")} className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Địa chỉ tạm trú</Label>
                                        <Input {...register("temporaryAddress")} className="h-9 text-sm capitalize" />
                                    </div>
                                </div>
                            </div>

                        </TabsContent>

                        {/* Records & Insurance Tab */}
                        <TabsContent value="records" className="space-y-4 pt-0 outline-none">
                            {/* Group 1: Identity & Tax */}
                            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/30 to-white dark:from-indigo-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-transparent border-b border-indigo-100 dark:border-indigo-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                        <CreditCard className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 tracking-wide">Thông tin Giấy tờ & Thuế</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số CMND/CCCD</Label>
                                        <Input {...register("nationalId")} className="h-9 text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày cấp</Label>
                                        <DatePicker value={watch("dateOfIssue")} onChange={(date) => setValue("dateOfIssue", date ? format(date, "yyyy-MM-dd") : "")} minYear={2000} maxYear={2100} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nơi cấp</Label>
                                        <Input {...register("placeOfIssue")} className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mã số thuế</Label>
                                        <Input {...register("taxCode")} className="h-9 text-sm font-medium text-indigo-700 dark:text-indigo-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Group 2: Insurance & Bank */}
                            <div className="rounded-xl border border-teal-100 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/30 to-white dark:from-teal-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-teal-500/10 to-transparent border-b border-teal-100 dark:border-teal-900/30">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                                        <Shield className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 tracking-wide">Thông tin Ngân hàng & Bảo hiểm</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số BHXH</Label>
                                        <Input {...register("socialInsuranceNo")} className="h-9 text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số BHYT</Label>
                                        <Input {...register("healthInsuranceNo")} className="h-9 text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngân hàng</Label>
                                        <Input {...register("bankName")} placeholder="VD: Vietcombank" className="h-9 text-sm capitalize" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số tài khoản</Label>
                                        <Input {...register("bankAccountNo")} className="h-9 text-sm font-semibold text-teal-700 dark:text-teal-400" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chi nhánh</Label>
                                        <Input {...register("bankBranch")} className="h-9 text-sm capitalize" />
                                    </div>
                                </div>
                            </div>

                            {/* Group 3: Other / Assets */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/30 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-slate-200/50 to-transparent dark:from-slate-800/50 border-b border-slate-200 dark:border-slate-800/60">
                                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-sm">
                                        <FolderOpen className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide">Thông tin khác</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bậc lương</Label>
                                        <Input {...register("salaryLevel")} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Thẻ từ</Label>
                                        <Select value={watch("accessCardStatus") || undefined} onValueChange={(val) => setValue("accessCardStatus", val)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ISSUED">Đã cấp</SelectItem>
                                                <SelectItem value="NOT_ISSUED">Chưa cấp</SelectItem>
                                                <SelectItem value="DAMAGED">Hư hỏng</SelectItem>
                                                <SelectItem value="LOST">Mất</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size Quần</Label>
                                        <Input {...register("uniformPantsSize")} placeholder="S, M, L..." className="h-9 text-sm uppercase" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size Áo</Label>
                                        <Input {...register("uniformShirtSize")} placeholder="S, M, L..." className="h-9 text-sm uppercase" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size Giầy</Label>
                                        <Input {...register("shoeSize")} placeholder="39, 40, 41..." className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mã hồ sơ cứng</Label>
                                        <Input {...register("recordCode")} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Người giới thiệu</Label>
                                        <Input {...register("referrer")} placeholder="Tên người giới thiệu" className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-3">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú</Label>
                                        <Textarea {...register("note")} placeholder="Ghi chú thêm..." className="min-h-[38px] text-sm resize-none" />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Family Tab */}
                        <TabsContent value="family" className="space-y-4 pt-0 outline-none">
                            <div className="rounded-xl border border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-pink-50/30 to-white dark:from-pink-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-pink-500/10 to-transparent border-b border-pink-100 dark:border-pink-900/30">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-sm">
                                            <Users className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-pink-700 dark:text-pink-400 tracking-wide">Thành viên Gia đình</h3>
                                        </div>
                                    </div>
                                    <Button type="button" size="sm" onClick={() => appendFamily({ name: "", relationship: "CHILD", dob: "", phoneNumber: "", job: "", note: "" })} className="h-8 shadow-sm bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 hover:border-pink-300 dark:bg-pink-950 dark:hover:bg-pink-900 dark:border-pink-800 dark:text-pink-300">
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Thêm thành viên
                                    </Button>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-pink-50/50 dark:bg-pink-950/30">
                                            <TableRow className="h-9 hover:bg-transparent border-pink-100 dark:border-pink-900/30">
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Họ và tên <span className="text-destructive">*</span></TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Quan hệ <span className="text-destructive">*</span></TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Ngày sinh</TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Tuổi</TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Điện thoại</TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Nghề nghiệp</TableHead>
                                                <TableHead className="text-sm font-semibold text-pink-700/70 dark:text-pink-400/70 h-9">Ghi chú</TableHead>
                                                <TableHead className="w-[40px] h-9"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {familyFields.map((field, index) => (
                                                <TableRow key={field.id} className="h-11 border-pink-50 dark:border-pink-900/10">
                                                    <TableCell className="py-2 pl-4">
                                                        <Input {...register(`familyMembers.${index}.name` as const)} placeholder="Họ và tên" className="h-8 text-sm capitalize font-medium" />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Select
                                                            value={watch(`familyMembers.${index}.relationship` as const)}
                                                            onValueChange={(val) => setValue(`familyMembers.${index}.relationship` as const, val as any)}
                                                        >
                                                            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {RELATIONSHIP_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <DatePicker
                                                            value={watch(`familyMembers.${index}.dob` as const)}
                                                            onChange={(date) => setValue(`familyMembers.${index}.dob` as const, date ? format(date, "yyyy-MM-dd") : "")}
                                                            minYear={1920} maxYear={2025}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-pink-100 dark:bg-pink-900/40 text-sm font-semibold text-pink-700 dark:text-pink-300">
                                                            {calculateAge(watch(`familyMembers.${index}.dob` as const)) || "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input {...register(`familyMembers.${index}.phoneNumber` as const)} onBlur={(e) => setValue(`familyMembers.${index}.phoneNumber` as const, formatPhoneNumber(e.target.value))} placeholder="SĐT gốc" className="h-8 text-sm" />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input {...register(`familyMembers.${index}.job` as const)} placeholder="Nghề nghiệp" className="h-8 text-sm capitalize" />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input {...register(`familyMembers.${index}.note` as const)} placeholder="Ghi chú" className="h-8 text-sm" />
                                                    </TableCell>
                                                    <TableCell className="py-2 pr-4 text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFamily(index)} className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {familyFields.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground h-24 bg-pink-50/20 dark:bg-transparent">
                                                        <div className="flex flex-col items-center justify-center gap-1.5 opacity-60 pointer-events-none">
                                                            <Users className="h-6 w-6 text-pink-300" />
                                                            <span>Chưa có thông tin nhân thân</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="flex justify-end p-4 border-t border-pink-100 dark:border-pink-900/30 bg-pink-50/10 dark:bg-pink-950/20">
                                        <Button 
                                            type="button" 
                                            onClick={handleSubmit(onSubmit, (errors) => {
                                                const errorMessages = getErrorMessages(errors).join(", ");
                                                toast.error(`Vui lòng kiểm tra lại: ${errorMessages}`);
                                            })} 
                                            disabled={isSubmitting} 
                                            className="h-9 rounded-full px-6 shadow-sm bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium"
                                        >
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isEdit ? "Cập nhật Gia đình" : "Lưu Gia đình"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Contracts Tab */}
                        <TabsContent value="contracts" className="space-y-4 pt-0 outline-none">
                            {/* Current Contract */}
                            <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 tracking-wide">Thông tin Hợp đồng</h3>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 shadow-sm bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-800 dark:text-amber-300"
                                        onClick={() => {
                                            const currentType = getValues("contractType");
                                            const currentNumber = getValues("contractNumber");
                                            const currentStart = getValues("contractStartDate");
                                            const currentEnd = getValues("contractEndDate");
                                            const currentNote = (getValues() as any).contractNote || "";

                                            if (currentType && currentStart && currentNumber) {
                                                appendContract({
                                                    contractNumber: currentNumber,
                                                    contractType: currentType as any,
                                                    startDate: currentStart,
                                                    endDate: currentEnd || "",
                                                    note: currentNote,
                                                });

                                                setValue("contractType", undefined);
                                                setValue("contractNumber", "");
                                                setValue("contractStartDate", "");
                                                setValue("contractEndDate", "");
                                                setValue("contractNote" as any, "");

                                                toast.success("Đã lưu vào lịch sử", {
                                                    description: "Thông tin hợp đồng cũ đã được chuyển xuống lịch sử.",
                                                });
                                            } else {
                                                const missing = [];
                                                if (!currentNumber) missing.push("Số HĐ");
                                                if (!currentType) missing.push("Loại HĐ");
                                                if (!currentStart) missing.push("Ngày bắt đầu");

                                                toast.error("Thiếu thông tin", {
                                                    description: `Vui lòng điền: ${missing.join(", ")}`,
                                                });
                                            }
                                        }}
                                    >
                                        <History className="w-3.5 h-3.5 mr-1.5" /> Lưu vào Lịch sử & Ký mới
                                    </Button>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-x-3 gap-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Số Hợp đồng</Label>
                                        <Input {...register("contractNumber")} placeholder="Số HĐ..." className="h-9 text-sm uppercase font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Loại hợp đồng</Label>
                                        <Select value={watch("contractType") || undefined} onValueChange={(val) => setValue("contractType", val as any)}>
                                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Chọn loại HĐ" /></SelectTrigger>
                                            <SelectContent>
                                                {CONTRACT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày bắt đầu</Label>
                                        <DatePicker value={watch("contractStartDate")} onChange={(date) => setValue("contractStartDate", date ? format(date, "yyyy-MM-dd") : "")} minYear={2000} maxYear={2100} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ngày kết thúc</Label>
                                        <DatePicker value={watch("contractEndDate")} onChange={(date) => setValue("contractEndDate", date ? format(date, "yyyy-MM-dd") : "")} minYear={2000} maxYear={2100} />
                                    </div>
                                    <div className="flex flex-col flex-1 space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ghi chú (Hợp đồng)</Label>
                                        <Input {...register("contractNote" as any)} placeholder="Ghi chú thêm..." className="h-9 text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Contract History */}
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800/60 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-900/30 dark:to-background overflow-hidden mt-4">
                                <div className="flex items-center gap-2.5 px-4 py-3 bg-muted/30 border-b border-slate-200 dark:border-slate-800/60">
                                    <History className="h-4 w-4 text-slate-500" />
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide">Lịch sử Hợp đồng</h3>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/20">
                                            <TableRow className="h-9 hover:bg-transparent border-slate-100 dark:border-slate-800/60">
                                                <TableHead className="text-sm font-semibold text-slate-500 h-9">Số Hợp Đồng</TableHead>
                                                <TableHead className="text-sm font-semibold text-slate-500 h-9">Loại Hợp Đồng</TableHead>
                                                <TableHead className="text-sm font-semibold text-slate-500 h-9">Ngày Bắt Đầu</TableHead>
                                                <TableHead className="text-sm font-semibold text-slate-500 h-9">Người ký</TableHead>
                                                <TableHead className="text-sm font-semibold text-slate-500 h-9">Ghi chú (Hợp đồng)</TableHead>
                                                <TableHead className="w-10 h-9"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contractFields.map((field, index) => {
                                                const isNewest = index === newestContractIndex;
                                                return (
                                                    <TableRow key={field.id} className={cn("h-11 border-slate-100 dark:border-slate-800/60", isNewest && "bg-amber-50/50 dark:bg-amber-900/10")}>
                                                        <TableCell className="py-2 pl-4">
                                                            {isNewest ? (
                                                                <Input {...register(`contracts.${index}.contractNumber` as const)} placeholder="Số HĐ" className="h-8 text-sm uppercase font-medium bg-white dark:bg-slate-950" />
                                                            ) : (
                                                                <span className="text-sm uppercase font-medium text-slate-700 dark:text-slate-300">{watch(`contracts.${index}.contractNumber` as const)}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {isNewest ? (
                                                                <Select value={watch(`contracts.${index}.contractType` as const)} onValueChange={(val) => setValue(`contracts.${index}.contractType` as const, val as any)}>
                                                                    <SelectTrigger className="w-[140px] h-8 text-sm bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {CONTRACT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            ) : (
                                                                <span className="text-sm text-slate-600 dark:text-slate-400">{CONTRACT_OPTIONS.find(o => o.value === watch(`contracts.${index}.contractType` as const))?.label}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {isNewest ? (
                                                                <DatePicker value={watch(`contracts.${index}.startDate` as const)} onChange={(date) => setValue(`contracts.${index}.startDate` as const, date ? format(date, "yyyy-MM-dd") : "")} minYear={2000} maxYear={2100} />
                                                            ) : (
                                                                <span className="text-sm text-slate-600 dark:text-slate-400">{watch(`contracts.${index}.startDate` as const) ? format(new Date(watch(`contracts.${index}.startDate` as const) as string), "dd/MM/yyyy") : "-"}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {isNewest ? (
                                                                <DatePicker value={watch(`contracts.${index}.endDate` as const)} onChange={(date) => setValue(`contracts.${index}.endDate` as const, date ? format(date, "yyyy-MM-dd") : "")} minYear={2000} maxYear={2100} />
                                                            ) : (
                                                                <span className="text-sm text-slate-600 dark:text-slate-400">{watch(`contracts.${index}.endDate` as const) ? format(new Date(watch(`contracts.${index}.endDate` as const) as string), "dd/MM/yyyy") : "-"}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2">
                                                            {isNewest ? (
                                                                <Input {...register(`contracts.${index}.note` as const)} placeholder="Ghi chú" className="h-8 text-sm bg-white dark:bg-slate-950" />
                                                            ) : (
                                                                <span className="text-sm text-slate-600 dark:text-slate-400">{watch(`contracts.${index}.note` as const) || "-"}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2 pr-4 text-right">
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeContract(index)} className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            {contractFields.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground h-24 bg-slate-50/20 dark:bg-transparent">
                                                        <div className="flex flex-col items-center justify-center gap-1.5 opacity-60 pointer-events-none">
                                                            <FileText className="h-6 w-6 text-slate-300" />
                                                            <span>Chưa có lịch sử hợp đồng</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Education Tab */}
                        <TabsContent value="education" className="space-y-4 pt-0 outline-none">
                            <div className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-gradient-to-br from-sky-50/30 to-white dark:from-sky-950/10 dark:to-background overflow-hidden transition-all hover:shadow-sm">
                                <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-sky-500/10 to-transparent border-b border-sky-100 dark:border-sky-900/30">
                                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm">
                                        <GraduationCap className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-400 tracking-wide">Thông tin Bằng cấp</h3>
                                    </div>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trình độ học vấn</Label>
                                        <Select value={watch("education") || undefined} onValueChange={(val) => setValue("education", val as any)}>
                                            <SelectTrigger className="h-10 text-sm font-medium"><SelectValue placeholder="Chọn trình độ" /></SelectTrigger>
                                            <SelectContent>
                                                {EDUCATION_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Chuyên ngành</Label>
                                        <Input {...register("major")} placeholder="VD: Công nghệ thông tin" className="h-10 text-sm capitalize font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trường đào tạo</Label>
                                        <Input {...register("school")} placeholder="VD: Đại học Bách Khoa" className="h-10 text-sm capitalize font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Năm tốt nghiệp</Label>
                                        <Input type="number" {...register("graduationYear")} placeholder="VD: 2020" min={1950} max={2100} className="h-10 text-sm font-medium" />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>


                        {/* Employment Events Tab (Only in Edit Mode) */}
                        {isEdit && initialData?.id && (
                            <TabsContent value="events">
                                <EmploymentEventsTab employeeId={initialData.id} />
                            </TabsContent>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-2 md:hidden">
                <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-full text-sm">
                    Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting} className="rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-medium">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? "Cập nhật" : "Tạo mới"}
                </Button>
            </div>
        </form>
    );
}
