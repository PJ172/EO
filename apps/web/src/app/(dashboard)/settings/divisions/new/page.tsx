import { DivisionForm } from "@/components/divisions/division-form";

export default function NewDivisionPage() {
    return (
        <div className="space-y-6">
            <DivisionForm returnUrl="/divisions" />
        </div>
    );
}
