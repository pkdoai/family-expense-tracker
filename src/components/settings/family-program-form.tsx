"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { familyProgramSchema, type FamilyProgramFormValues } from "@/lib/validation/settings-schema";
import { formatDateRange } from "@/lib/domain/week";
import { programStartDate, programEndDate } from "@/lib/domain/week";

export function FamilyProgramForm() {
  const { settings, updateFamily, updateProgram, completeOnboarding } = useSettings();
  const { expenses } = useExpenses();
  const [pendingValues, setPendingValues] = React.useState<FamilyProgramFormValues | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<FamilyProgramFormValues>({
    resolver: zodResolver(familyProgramSchema),
    defaultValues: {
      familyName: settings.family.familyName,
      startDate: settings.program.startDate,
      lengthWeeks: settings.program.lengthWeeks,
      weekBoundary: settings.program.weekBoundary,
    },
  });

  const programChanged = React.useCallback(
    (values: FamilyProgramFormValues) =>
      values.startDate !== settings.program.startDate ||
      values.lengthWeeks !== settings.program.lengthWeeks ||
      values.weekBoundary !== settings.program.weekBoundary,
    [settings.program],
  );

  function applyValues(values: FamilyProgramFormValues) {
    updateFamily({ familyName: values.familyName.trim() });
    updateProgram({
      startDate: values.startDate,
      lengthWeeks: values.lengthWeeks,
      weekBoundary: values.weekBoundary,
    });
    if (!settings.onboarded) completeOnboarding();
    toast.success("Saved");
  }

  function onSubmit(values: FamilyProgramFormValues) {
    // Warn before a program-date change reshuffles week numbers under existing expenses.
    if (expenses.length > 0 && programChanged(values)) {
      setPendingValues(values);
      return;
    }
    applyValues(values);
  }

  const currentRange = formatDateRange(programStartDate(settings.program), programEndDate(settings.program));

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Family &amp; Program</CardTitle>
            <CardDescription>
              {settings.onboarded
                ? `Currently tracking ${currentRange}.`
                : "Set your family name and program dates to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="family-name">Family name</Label>
              <Input id="family-name" placeholder="e.g. The Doster Family" {...register("familyName")} />
              {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="program-start">Start date</Label>
                <Input id="program-start" type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="program-length">Length (weeks)</Label>
                <Input
                  id="program-length"
                  type="number"
                  min={1}
                  max={52}
                  {...register("lengthWeeks", { valueAsNumber: true })}
                />
                {errors.lengthWeeks && <p className="text-xs text-destructive">{errors.lengthWeeks.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Week starts on</Label>
                <Controller
                  control={control}
                  name="weekBoundary"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sunday">Sunday</SelectItem>
                        <SelectItem value="monday">Monday</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!isDirty && settings.onboarded}>
              {settings.onboarded ? "Save changes" : "Start tracking"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingValues)}
        onOpenChange={(o) => !o && setPendingValues(null)}
        title="Change program dates?"
        description="You already have expenses logged. Changing the start date, length, or week boundary will change which week each existing expense falls into — amounts and categories are untouched, but weekly totals will be recalculated."
        confirmLabel="Change anyway"
        destructive
        onConfirm={() => {
          if (pendingValues) applyValues(pendingValues);
          setPendingValues(null);
        }}
      />
    </>
  );
}
