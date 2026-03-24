import { SectionForm } from "@/components/sections/section-form";

export default async function EditSectionPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <SectionForm sectionId={resolvedParams.id} returnUrl="/sections" />
        </div>
    );
}
