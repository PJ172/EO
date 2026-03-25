import { JobTitleForm } from "@/components/job-titles/job-title-form";

export default async function EditJobTitlePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <JobTitleForm jobTitleId={resolvedParams.id} />
        </div>
    );
}
