"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";

export function AddExpenseButton({
  variant = "default",
  size = "default",
  className,
  label = "Add Expense",
}: {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Plus />
        {label || null}
      </Button>
      <ExpenseFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
