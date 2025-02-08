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
  onUpdate?: () => void
}

export function NewUserDialog({
  open,
  onOpenChange,
  onUpdate
}: NewUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <NewUserForm />
      </DialogContent>
    </Dialog>
  )
} 