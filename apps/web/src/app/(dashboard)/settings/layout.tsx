"use client";

import { PermissionGate } from "@/components/auth/permission-gate";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Only users with SETTINGS_VIEW or SETTINGS_MANAGE can access any page under /settings
    return (
        <PermissionGate permissions={["SETTINGS_VIEW", "SETTINGS_MANAGE"]}>
            <div className="flex flex-col flex-1 h-full w-full">
                {children}
            </div>
        </PermissionGate>
    );
}
