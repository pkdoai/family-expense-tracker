"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/shared/category-icon";

import { useSettings } from "@/lib/hooks/use-settings";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { useCategories } from "@/lib/hooks/use-workbook";
import { SECTION_LABEL } from "@/lib/domain/categories";
import { PAYMENT_TYPES, WorkbookError } from "@/lib/workbook";
import { buildExpenseSchema, type ExpenseFormValues } from "@/lib/validation/expense-schema";
import { programStartDate, programEndDate } from "@/lib/domain/week";
import { dollarsToCents, centsToDollars } from "@/lib/domain/currency";
import { photoRepository } from "@/lib/storage/repositories";
import type { Expense } from "@/lib/domain/types";

interface PhotoDraft {
  key: string;
  file: File;
  url: string;
}

interface ExistingPhoto {
  id: string;
  url: string;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present for edit mode; omitted for create. */
  expense?: Expense;
}) {
  const { settings } = useSettings();
  const { addExpense, updateExpense } = useExpenses();
  const isEdit = Boolean(expense);

  const categories = useCategories();
  const schema = React.useMemo(() => buildExpenseSchema(settings.program, categories), [settings.program, categories]);
  const firstCategoryId = categories.list[0]?.id ?? "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: undefined,
      category: firstCategoryId,
      description: "",
      paymentType: undefined,
    },
  });

  const category = watch("category");
  const [newPhotos, setNewPhotos] = React.useState<PhotoDraft[]>([]);
  const [existingPhotos, setExistingPhotos] = React.useState<ExistingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset the form whenever the dialog opens (create: blank; edit: populate from the expense).
  React.useEffect(() => {
    if (!open) return;
    setNewPhotos([]);
    setRemovedPhotoIds([]);
    if (expense) {
      reset({
        date: expense.date,
        amount: centsToDollars(expense.amountCents),
        category: expense.category,
        description: expense.description,
        paymentType: expense.paymentType,
      });
      photoRepository.listByExpense(expense.id).then((photos) => {
        setExistingPhotos(photos.map((p) => ({ id: p.id, url: URL.createObjectURL(p.blob) })));
      });
    } else {
      reset({
        date: format(new Date(), "yyyy-MM-dd"),
        amount: undefined,
        category: firstCategoryId,
        description: "",
        paymentType: undefined,
      });
      setExistingPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({ key: `${file.name}_${Date.now()}_${Math.random()}`, file, url: URL.createObjectURL(file) })),
    ]);
    e.target.value = "";
  }

  async function onSubmit(values: ExpenseFormValues) {
    const remainingExisting = existingPhotos.filter((p) => !removedPhotoIds.includes(p.id));
    for (const id of removedPhotoIds) {
      await photoRepository.remove(id);
    }

    const payload = {
      date: values.date,
      amountCents: dollarsToCents(values.amount),
      category: values.category,
      description: values.description,
      paymentType: categories.isIncome(values.category) ? undefined : values.paymentType,
      photoIds: remainingExisting.map((p) => p.id),
    };

    try {
      if (isEdit && expense) {
        await updateExpense(expense.id, payload, newPhotos.map((p) => p.file));
        toast.success("Expense updated");
      } else {
        await addExpense(payload, newPhotos.map((p) => p.file));
        toast.success("Expense added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof WorkbookError ? err.message : "Something went wrong saving that expense — please try again.",
      );
    }
  }

  const minDate = format(programStartDate(settings.program), "yyyy-MM-dd");
  const maxDate = format(programEndDate(settings.program), "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the details below." : `Added to ${settings.family.familyName || "your family"}'s spending plan.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">Date</Label>
              <Input id="expense-date" type="date" min={minDate} max={maxDate} {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-6"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["fixed", "variable", "income"] as const).map((section) => {
                      const items = categories.list.filter((c) => c.section === section);
                      if (items.length === 0) return null;
                      return (
                        <SelectGroup key={section}>
                          <SelectLabel>{SECTION_LABEL[section]}</SelectLabel>
                          {items.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <CategoryIcon category={c.id} size={15} />
                                {c.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {!categories.isIncome(category) && (
            <div className="space-y-1.5">
              <Label>How was it paid?</Label>
              <Controller
                control={control}
                name="paymentType"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How was it paid?">
                    {PAYMENT_TYPES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={field.value === p.id}
                        onClick={() => field.onChange(p.id)}
                        className={
                          "rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                          (field.value === p.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input text-muted-foreground hover:border-primary/50")
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.paymentType && <p className="text-xs text-destructive">{errors.paymentType.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea id="expense-description" rows={2} placeholder="What was this for?" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Receipt photo</Label>
            <div className="flex flex-wrap gap-2">
              {existingPhotos
                .filter((p) => !removedPhotoIds.includes(p.id))
                .map((p) => (
                  <div key={p.id} className="group relative size-16 overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Receipt" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRemovedPhotoIds((prev) => [...prev, p.id])}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              {newPhotos.map((p) => (
                <div key={p.key} className="group relative size-16 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="Receipt" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewPhotos((prev) => prev.filter((x) => x.key !== p.key))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex size-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Camera className="size-4" />
                <span className="text-[10px]">Add</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <p className="text-xs text-muted-foreground">Optional. Take a picture or attach an existing photo of the receipt.</p>
          </div>

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
