import { SectionForm } from "@/components/sections/section-form";

export default function NewSectionPage() {
    return (
        <div className="space-y-6">
            <SectionForm returnUrl="/sections" />
        </div>
    );
}
