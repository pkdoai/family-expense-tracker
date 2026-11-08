"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { WeeklyTrendPoint } from "@/lib/domain/dashboard-stats";
import { formatCents } from "@/lib/domain/currency";
import type { BudgetStatus } from "@/lib/domain/types";

const STATUS_COLOR: Record<BudgetStatus, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
};

interface ChartPoint {
  week: number;
  dollars: number | null;
  plan: number | null;
  status: BudgetStatus;
}

function TrendDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.dollars == null) return null;
  return <circle cx={cx} cy={cy} r={4.5} fill={STATUS_COLOR[payload.status]} stroke="var(--card)" strokeWidth={1.5} />;
}

export function TrendChart({
  trend,
  weeks,
  planForWeek,
}: {
  trend: WeeklyTrendPoint[];
  /** Every week number in the program, in order. */
  weeks: number[];
  /** What the spending plan says for a week, in cents (null when nothing is planned). */
  planForWeek: (week: number) => number | null;
}) {
  const firstWeek = weeks[0] ?? 0;
  const lastWeek = weeks[weeks.length - 1] ?? 0;
  const lastActualWeek = trend.length > 0 ? trend[trend.length - 1].week : firstWeek - 1;

  const data: ChartPoint[] = weeks.map((week) => {
    const point = trend.find((p) => p.week === week);
    const plan = planForWeek(week);
    return {
      week,
      dollars: point ? point.totalCents / 100 : null,
      plan: plan === null ? null : plan / 100,
      status: point?.status ?? "good",
    };
  });

  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        {lastActualWeek < lastWeek && (
          <ReferenceArea x1={lastActualWeek + 0.5} x2={lastWeek} fill="var(--muted)" fillOpacity={0.5} />
        )}
        <XAxis
          dataKey="week"
          type="number"
          domain={[firstWeek, lastWeek]}
          ticks={weeks.filter((w) => w === firstWeek || w === lastWeek || w % Math.max(1, Math.round(weeks.length / 6)) === 0)}
          tickFormatter={(w) => `W${w}`}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 10.5, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          formatter={(value) => formatCents(Number(value) * 100)}
          labelFormatter={(w) => `Week ${w}`}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12.5,
          }}
        />
        <Line
          type="stepAfter"
          dataKey="plan"
          name="Plan"
          stroke="var(--muted-foreground)"
          strokeDasharray="5 4"
          strokeWidth={1.5}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="dollars"
          name="Spent"
          stroke="var(--primary)"
          strokeWidth={2.25}
          fill="var(--primary)"
          fillOpacity={0.09}
          connectNulls={false}
          dot={<TrendDot />}
          activeDot={{ r: 5.5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
