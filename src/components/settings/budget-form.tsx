"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { useSettings } from "@/lib/hooks/use-settings";
import { budgetSchema, type BudgetFormValues } from "@/lib/validation/settings-schema";
import { dollarsToCents, centsToDollars } from "@/lib/domain/currency";

export function BudgetForm() {
  const { settings, updateBudget } = useSettings();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      weeklyBudget: settings.budget.weeklyBudgetCents != null ? centsToDollars(settings.budget.weeklyBudgetCents) : undefined,
    },
  });

  function onSubmit(values: BudgetFormValues) {
    const hasValue = values.weeklyBudget != null && !Number.isNaN(values.weeklyBudget);
    updateBudget({ weeklyBudgetCents: hasValue ? dollarsToCents(values.weeklyBudget as number) : null });
    toast.success("Budget target saved");
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>Weekly Budget</CardTitle>
          <CardDescription>
            Set a target to see budget-vs-actual on the dashboard and get a heads-up when a week runs over. Leave blank to
            turn this off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-[220px] space-y-1.5">
            <Label htmlFor="weekly-budget">Weekly target</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="weekly-budget"
                type="number"
                step="0.01"
                min="0"
                placeholder="No target set"
                className="pl-6"
                {...register("weeklyBudget", { valueAsNumber: true })}
              />
            </div>
            {errors.weeklyBudget && <p className="text-xs text-destructive">{errors.weeklyBudget.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Save budget</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
