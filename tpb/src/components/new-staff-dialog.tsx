'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NewStaffForm } from "@/components/new-staff-form"

interface NewStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export const NewStaffDialog = ({
  open,
  onOpenChange,
  onUpdate,
}: NewStaffDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
        </DialogHeader>
        <NewStaffForm
          onClose={() => onOpenChange(false)}
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  )
} 