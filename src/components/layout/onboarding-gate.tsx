"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartyPopper } from "lucide-react";

import { useSettings } from "@/lib/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Gates every route except /settings until the family has completed the
 * one-time family name + program setup — there's nothing meaningful to
 * show a dashboard or expense list for before that exists.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { settings, loaded } = useSettings();
  const pathname = usePathname();

  if (!loaded) return null;

  if (!settings.onboarded && pathname !== "/settings") {
    return (
      <div className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <EmptyState
          icon={PartyPopper}
          title="Welcome — let's get set up"
          description="Enter your family name and program dates to start tracking expenses. It takes under a minute."
          action={
            <Button asChild>
              <Link href="/settings">Set up now</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
