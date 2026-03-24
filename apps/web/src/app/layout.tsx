import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { QueryProvider, FeatureFlagsProvider, ModuleRegistryProvider } from "@/providers";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { SocketProvider } from "@/components/providers/socket-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eOffice - Enterprise Office Management",
  description: "Hệ thống quản lý văn phòng doanh nghiệp",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen font-sans`}
      >
        <ErrorBoundary>
          <QueryProvider>
            <FeatureFlagsProvider>
              <ModuleRegistryProvider>
                <SocketProvider>
                  <AuthProvider>
                    <NuqsAdapter>
                      {children}
                    </NuqsAdapter>
                    <Toaster />
                  </AuthProvider>
                </SocketProvider>
              </ModuleRegistryProvider>
            </FeatureFlagsProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
