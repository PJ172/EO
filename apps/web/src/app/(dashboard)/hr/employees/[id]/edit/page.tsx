"use client";

import { useEmployee } from "@/services/employee.service";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmployeeForm } from "@/components/employees/employee-form";
import { Skeleton } from "@/components/ui/skeleton";
import { use } from "react";

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: employee, isLoading, isError } = useEmployee(id);

    if (isLoading) {
        return (
            <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-7 w-64" />
                </div>
                <Skeleton className="h-[600px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError || !employee) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center space-y-3">
                    <p className="text-muted-foreground text-lg">Không tìm thấy nhân viên</p>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Về danh sách
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in">
            <EmployeeForm initialData={employee} isEdit />
        </div>
    );
}
