import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";

import type { ProgramSettings, WeekBoundary } from "@/lib/domain/types";

/**
 * Week arithmetic for the program. Pure functions only — no I/O, no React —
 * so week numbering can be unit-tested and reused identically by the
 * dashboard, the expense filters, and CSV export.
 *
 * Weeks are aligned to the chosen calendar boundary (Sunday-Saturday or
 * Monday-Sunday): "Week 1" is the boundary-aligned calendar week that
 * contains the program's start date (it may be shorter than 7 days if the
 * start date doesn't fall exactly on the boundary day), and every
 * subsequent week follows in full 7-day blocks. The valid expense date
 * range is always the program's exact [startDate, endDate] span, regardless
 * of where week boundaries fall.
 */

function boundaryDayIndex(boundary: WeekBoundary): number {
  // date-fns / JS Date: 0 = Sunday ... 6 = Saturday
  return boundary === "sunday" ? 0 : 1;
}

/** Midnight-normalized start of the calendar week (per boundary) containing `date`. */
export function calendarWeekStart(date: Date, boundary: WeekBoundary): Date {
  const target = boundaryDayIndex(boundary);
  const day = date.getDay();
  const diff = (day - target + 7) % 7;
  return addDays(startOfDay(date), -diff);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function programStartDate(program: ProgramSettings): Date {
  return startOfDay(parseISO(program.startDate));
}

/** Inclusive end date of the program. */
export function programEndDate(program: ProgramSettings): Date {
  return addDays(programStartDate(program), program.lengthWeeks * 7 - 1);
}

export function week1Start(program: ProgramSettings): Date {
  return calendarWeekStart(programStartDate(program), program.weekBoundary);
}

/** Start/end (inclusive) of a given 1-based week number. */
export function weekRange(program: ProgramSettings, weekNumber: number): { start: Date; end: Date } {
  const start = addDays(week1Start(program), (weekNumber - 1) * 7);
  return { start, end: addDays(start, 6) };
}

/**
 * Which program week a date falls in, or null if the date is outside the
 * program's [startDate, endDate] span entirely.
 */
export function weekNumberForDate(program: ProgramSettings, date: Date): number | null {
  const d = startOfDay(date);
  if (d < programStartDate(program) || d > programEndDate(program)) return null;
  const days = differenceInCalendarDays(calendarWeekStart(d, program.weekBoundary), week1Start(program));
  return Math.floor(days / 7) + 1;
}

export function isDateWithinProgram(program: ProgramSettings, date: Date): boolean {
  const d = startOfDay(date);
  return d >= programStartDate(program) && d <= programEndDate(program);
}

export interface ProgramProgress {
  /** Current week number, clamped to [1, lengthWeeks]. Null before the program starts. */
  currentWeek: number | null;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  /** 0-100 */
  percentComplete: number;
  hasStarted: boolean;
  hasEnded: boolean;
}

export function getProgramProgress(program: ProgramSettings, today: Date = new Date()): ProgramProgress {
  const start = programStartDate(program);
  const end = programEndDate(program);
  const totalDays = program.lengthWeeks * 7;
  const t = startOfDay(today);

  const hasStarted = t >= start;
  const hasEnded = t > end;

  const daysElapsed = Math.min(Math.max(differenceInCalendarDays(t, start) + 1, 0), totalDays);
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);
  const percentComplete = totalDays === 0 ? 0 : Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  let currentWeek: number | null = null;
  if (hasStarted) {
    currentWeek = hasEnded ? program.lengthWeeks : (weekNumberForDate(program, t) ?? program.lengthWeeks);
  }

  return { currentWeek, daysElapsed, daysRemaining, totalDays, percentComplete, hasStarted, hasEnded };
}

export function formatWeekLabel(weekNumber: number): string {
  return `Week ${weekNumber}`;
}

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}
