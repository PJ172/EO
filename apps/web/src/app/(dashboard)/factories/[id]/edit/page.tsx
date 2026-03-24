import { FactoryForm } from "@/components/factories/factory-form";

export default async function EditFactoryPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    return (
        <div className="space-y-6">
            <FactoryForm factoryId={resolvedParams.id} />
        </div>
    );
}
