"use client";

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { useCategories } from "@/lib/hooks/use-workbook";
import { formatCents } from "@/lib/domain/currency";
import type { CategoryId } from "@/lib/domain/types";

interface Row {
  category: CategoryId;
  label: string;
  cents: number;
}

export function CategoryBreakdownChart({ totals }: { totals: Partial<Record<CategoryId, number>> }) {
  const categories = useCategories();
  const rows: Row[] = categories.expenseList.map((c) => ({ category: c.id, label: c.label, cents: totals[c.id] ?? 0 }))
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  if (rows.length === 0) return null;

  const rowHeight = 28;
  const chartHeight = Math.max(rows.length * rowHeight, 120);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12.5, fill: "var(--foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => formatCents(Number(value))}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12.5,
          }}
        />
        <Bar dataKey="cents" radius={[4, 4, 4, 4]} maxBarSize={9}>
          {rows.map((row) => (
            <Cell key={row.category} fill={`var(--${categories.get(row.category).colorVar})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
