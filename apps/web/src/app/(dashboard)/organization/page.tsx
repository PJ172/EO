"use client";

import { OrganizationChart } from "@/components/organization/org-chart";

export default function OrganizationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Sơ Đồ Tổ Chức</h2>
            </div>

            <div className="bg-muted/10 rounded-xl border border-dashed text-center min-h-[600px] overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <OrganizationChart />
            </div>
        </div>
    );
}
