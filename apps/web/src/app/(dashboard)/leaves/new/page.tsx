"use client";

import { LeaveForm } from "@/components/leaves/leave-form";

export default function NewLeavePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Đơn Xin Nghỉ Phép</h1>
                <p className="text-muted-foreground">
                    Điền thông tin để tạo đơn xin nghỉ phép mới
                </p>
            </div>
            <LeaveForm />
        </div>
    );
}
