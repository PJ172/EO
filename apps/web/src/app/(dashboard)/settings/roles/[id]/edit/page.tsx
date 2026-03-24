import { RoleForm } from "@/components/roles/role-form";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <RoleForm roleId={resolvedParams.id} />
        </div>
    );
}
