# Family Expense Tracker

A private, on-device expense tracker built for a single family's fixed-length
budget program (16 weeks by default, configurable). Everything is stored
locally in the browser — no server, no account, no data leaving the device.

Created by PK / Sidney.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling, hand-written [shadcn/ui](https://ui.shadcn.com)-style
  components on top of **Radix UI** primitives (the shadcn CLI's registry
  wasn't reachable from this environment, so the components were hand-built
  to the same conventions — same file layout, same props, same behavior)
- **IndexedDB** (via [`idb`](https://www.npmjs.com/package/idb)) for expenses
  and receipt photos; **localStorage** for settings (family name, program
  dates, weekly budget) — small, synchronous data that's read on every page
- **react-hook-form** + **Zod** for form validation
- **Recharts** for the category breakdown and 16-week trend charts
- **cmdk** for the ⌘K / Ctrl+K command palette
- **sonner** for toast notifications (budget alerts, save confirmations)
- A hand-written service worker + web app manifest for installability (PWA)

### One deliberate deviation from the original spec

The original requirements called for `react-day-picker` as the date picker.
On inspection it's a brand-new major version (v10) with an unfamiliar API
and no easily discoverable stylesheet export. Rather than ship something
built against an unfamiliar API, the app uses native `<input type="date">`
fields instead. This is more robust, needs no extra dependency or custom
CSS, and gives mobile users their OS's native date picker (which is
generally a better experience than a JS-rendered calendar on a phone).

## Running the app

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production build (recommended for actually using the app day-to-day,
and required to test the installable/offline behavior — the service worker
only registers in production):

```bash
npm run build
npm run start
```

Other useful commands:

```bash
npm run lint     # ESLint (flat config, Next.js + TypeScript rules)
```

## First-time setup

The app walks you through this on first load, but in short: open
**Settings** and enter your family name, program start date, program
length (in weeks), and which day your weeks should start on (Sunday or
Monday). You can optionally set a weekly budget target on the same page —
leave it blank to turn off budget tracking and alerts.

Want to see the app with realistic data first? On the Settings page, use
**Load sample data** to generate a full program's worth of sample expenses
across every category.

## Feature testing checklist

Use this to verify everything works after pulling the code or making changes.

**Onboarding & settings**
- [ ] First visit to any page shows the "let's get set up" screen and
      routes you to Settings
- [ ] Entering a family name and program dates and clicking "Start
      tracking" unlocks the rest of the app
- [ ] The family name appears in the header and on exported CSVs
- [ ] Changing the program's start date, length, or week boundary *after*
      expenses exist shows a warning dialog before applying
- [ ] Setting a weekly budget target shows budget-vs-actual on the
      dashboard; clearing it hides the budget card

**Adding & editing expenses**
- [ ] "Add Expense" (header button or ⌘K palette) opens a form with date,
      amount, category, description, and an optional receipt photo
- [ ] The date field only accepts dates inside the program's date range
- [ ] Choosing category "Other" reveals sub-category and payment-method
      fields (every other category keeps the form minimal)
- [ ] Attaching a photo (file picker or, on mobile, camera capture) shows
      a thumbnail before saving
- [ ] Editing an existing expense (via the ••• menu on the Expenses page)
      pre-fills the form, including its existing photo
- [ ] Deleting an expense asks for confirmation and removes its photo too

**Dashboard**
- [ ] Stat tiles show total spent, this week's spend, and the top category
- [ ] The budget card shows on-track / approaching / over-budget status
      with the right color
- [ ] The category breakdown chart only shows categories with spending
- [ ] The 16-week trend chart plots one point per week so far, colored by
      that week's budget status, with a dashed budget reference line
- [ ] A week that crosses into "approaching" or "over" budget fires a
      toast notification (once per week, not on every visit)
- [ ] "Recent Expenses" lists the latest entries with a link to the full list
- [ ] A brand-new program with no expenses shows an empty state, not a
      broken/empty chart area

**Expenses page**
- [ ] Search filters by description text
- [ ] Category and week filters narrow the list; "Clear" resets them
- [ ] "Export CSV" downloads a file containing the family name, date,
      week number, category, description, and amount for the filtered rows

**Command palette (⌘K / Ctrl+K)**
- [ ] Opens from anywhere in the app
- [ ] "Add expense" opens the expense form
- [ ] Navigation entries jump to Dashboard / Expenses / Settings
- [ ] "Jump to a week" and "Filter by category" entries take you to the
      Expenses page pre-filtered

**Backup, restore & sample data**
- [ ] "Export backup" downloads a JSON file containing every expense,
      every receipt photo, and your settings
- [ ] "Restore from file" on that same JSON file replaces current data
      after a confirmation warning
- [ ] "Load sample data" replaces current expenses with generated sample
      data after a confirmation warning
- [ ] "Clear all data" removes every expense and photo after a
      confirmation warning, but leaves your settings intact

**Installable / offline (PWA)** — run `npm run build && npm run start` first
- [ ] The browser offers an "Install" prompt (address-bar icon on
      desktop Chrome/Edge, "Add to Home Screen" in Chrome's menu on
      Android, or Share → "Add to Home Screen" in Safari on iOS)
- [ ] The installed app opens in its own window without browser chrome
- [ ] After the app has loaded once, reloading it while offline (e.g.
      DevTools → Network → Offline) still shows the app shell instead of
      a browser error page

## Installing as an app (PWA)

- **Windows 11 (Edge or Chrome):** open the app, click the install icon
  in the address bar (or the browser's "Install app" menu item). It runs
  in its own window and appears in the Start menu, just like a native app.
- **macOS (Chrome/Edge):** same as Windows — an install icon appears in
  the address bar.
- **Android (Chrome):** open the app, then use the menu → "Add to Home
  screen" (or accept the automatic install banner).
- **iPhone/iPad (Safari):** open the app, tap the Share icon, then "Add
  to Home Screen."

Once installed, the app works offline for anything already loaded — all
of your data lives in the browser's local storage/IndexedDB on that
device, so it's private to that device and isn't synced anywhere. Use
the backup/restore feature in Settings to move data to another device.

## Architecture notes

The codebase is layered so each layer only depends on the one below it:

```
src/
  lib/domain/      pure functions & types — no React, no storage, no I/O
  lib/storage/     repository interfaces + IndexedDB/localStorage implementations
  lib/validation/  Zod schemas (some built as factories, since date-range
                    validation depends on the runtime program settings)
  lib/hooks/       React context providers wrapping the repositories
  components/      ui/ (primitives) -> shared/ -> dashboard/ | expenses/ | settings/ | layout/
  app/             routes, composed from the above
```

`src/lib/storage/repositories.ts` is the app's single composition root —
it's the only file that instantiates concrete storage classes. Everything
else depends on the `ExpenseRepository` / `PhotoRepository` /
`SettingsRepository` interfaces, so swapping storage technology later means
editing one file.
