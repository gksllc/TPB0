'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NewUserForm } from "@/components/new-user-form"

interface NewUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export const NewUserDialog = ({
  open,
  onOpenChange,
  onUpdate,
}: NewUserDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <NewUserForm
          onClose={() => onOpenChange(false)}
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  )
} 