import type { Metadata, Viewport } from "next";

import "./globals.css";
import { AppProviders } from "@/components/shared/app-providers";
import { AppHeader } from "@/components/layout/app-header";
import { ProgramProgress } from "@/components/layout/program-progress";
import { OnboardingGate } from "@/components/layout/onboarding-gate";
import { CommandPalette } from "@/components/layout/command-palette";
import { AppFooter } from "@/components/layout/app-footer";
import { UnsavedBanner } from "@/components/layout/unsaved-banner";
import { ServiceWorkerRegistration } from "@/components/shared/service-worker-registration";

export const metadata: Metadata = {
  title: "Family Expense Tracker",
  description: "A private, on-device expense tracker for a fixed-length family budget program.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expense Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#146356",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <AppProviders>
          <ServiceWorkerRegistration />
          <AppHeader />
          <UnsavedBanner />
          <ProgramProgress />
          <CommandPalette />
          <main className="flex flex-1 flex-col">
            <OnboardingGate>{children}</OnboardingGate>
          </main>
          <AppFooter />
        </AppProviders>
      </body>
    </html>
  );
}
