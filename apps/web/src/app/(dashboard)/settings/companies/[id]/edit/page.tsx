import { CompanyForm } from "@/components/companies/company-form";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <CompanyForm companyId={resolvedParams.id} />
        </div>
    );
}
