"use client";

import { redirect } from "next/navigation";
import { use } from "react";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    redirect(`/employees/${id}/edit`);
}
