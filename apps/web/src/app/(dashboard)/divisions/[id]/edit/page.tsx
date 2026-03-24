import { DivisionForm } from "@/components/divisions/division-form";

export default async function EditDivisionPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <DivisionForm divisionId={resolvedParams.id} returnUrl="/divisions" />
        </div>
    );
}
