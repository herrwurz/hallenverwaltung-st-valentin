"use client";

import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

type ModalFormActionsProps = {
  submitLabel: string;
  cancelLabel?: string;
};

/**
 * Wie FormActions, aber fuer Formulare in einem Dialog: "Abbrechen" schliesst
 * den Dialog statt zu einer Seite zu navigieren.
 */
export function ModalFormActions({ submitLabel, cancelLabel = "Abbrechen" }: ModalFormActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
      <DialogClose asChild>
        <Button type="button" variant="outline">
          {cancelLabel}
        </Button>
      </DialogClose>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
