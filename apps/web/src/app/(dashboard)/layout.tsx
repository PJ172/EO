import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { AvatarLightboxProvider } from "@/components/ui/avatar-lightbox";
import { AIChatWidget } from "@/components/ai/AIChatWidget";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AvatarLightboxProvider>
            <div className="mesh-background min-h-screen w-full">
                <SidebarProvider className="bg-transparent">
                    <AppSidebar />
                    <CommandMenu />
                    <SidebarInset className="bg-transparent p-0 h-screen overflow-hidden">
                        <div className="content-island flex flex-col flex-1 h-full w-full overflow-hidden m-0 relative">
                            {children}
                        </div>
                    </SidebarInset>
                    <AIChatWidget />
                </SidebarProvider>
            </div>
        </AvatarLightboxProvider>
    );
}
