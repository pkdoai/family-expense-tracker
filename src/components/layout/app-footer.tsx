/**
 * Always-visible app version, read from package.json at build time.
 * Lets a family (or a Case Manager) tell at a glance which build a phone is running.
 */
export function AppFooter() {
  return (
    <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
      Family Expense Tracker · <span data-testid="app-version">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
    </footer>
  );
}
