import { DepartmentForm } from "@/components/departments/department-form";

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <DepartmentForm departmentId={resolvedParams.id} />
        </div>
    );
}
