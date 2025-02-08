'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EditUserForm } from "./edit-user-form"

interface EditUserDialogProps {
  user: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zip_code: string | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onUpdate,
}: EditUserDialogProps) => {
  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-2">
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <EditUserForm
          user={user}
          onClose={() => onOpenChange(false)}
          onUpdate={onUpdate}
        />
      </DialogContent>
    </Dialog>
  )
} 