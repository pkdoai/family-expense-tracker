const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Format integer cents as a localized currency string, e.g. 194050 -> "$1,940.50". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/** Convert a dollars-and-cents number (as entered in a form) to integer cents. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}
