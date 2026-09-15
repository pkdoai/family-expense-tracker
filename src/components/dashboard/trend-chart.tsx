"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
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
  status: BudgetStatus;
}

function TrendDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload || payload.dollars == null) return null;
  return <circle cx={cx} cy={cy} r={4.5} fill={STATUS_COLOR[payload.status]} stroke="var(--card)" strokeWidth={1.5} />;
}

export function TrendChart({
  trend,
  lengthWeeks,
  weeklyBudgetCents,
}: {
  trend: WeeklyTrendPoint[];
  lengthWeeks: number;
  weeklyBudgetCents: number | null;
}) {
  const lastActualWeek = trend.length > 0 ? trend[trend.length - 1].week : 0;

  const data: ChartPoint[] = Array.from({ length: lengthWeeks }, (_, i) => {
    const week = i + 1;
    const point = trend.find((p) => p.week === week);
    return { week, dollars: point ? point.totalCents / 100 : null, status: point?.status ?? "good" };
  });

  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        {lastActualWeek < lengthWeeks && (
          <ReferenceArea x1={lastActualWeek + 0.5} x2={lengthWeeks} fill="var(--muted)" fillOpacity={0.5} />
        )}
        <XAxis
          dataKey="week"
          type="number"
          domain={[1, lengthWeeks]}
          ticks={Array.from({ length: lengthWeeks }, (_, i) => i + 1).filter(
            (w) => w === 1 || w === lengthWeeks || w % Math.max(1, Math.round(lengthWeeks / 6)) === 0,
          )}
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
        {weeklyBudgetCents ? (
          <ReferenceLine
            y={weeklyBudgetCents / 100}
            stroke="var(--muted-foreground)"
            strokeDasharray="5 4"
            label={{ value: `$${(weeklyBudgetCents / 100).toFixed(0)} budget`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="dollars"
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
