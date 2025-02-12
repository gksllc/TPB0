import React from 'react'
import { format } from 'date-fns'
import { Edit2, Trash2, User, Pencil, PawPrint } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AppointmentWithRelations } from '@/lib/types/appointments'
import Image from 'next/image'

interface AppointmentListProps {
  appointments: AppointmentWithRelations[]
  onEdit: (appointment: AppointmentWithRelations) => void
  onDelete: (appointmentId: string) => void
}

export const AppointmentList = React.memo(function AppointmentList({ 
  appointments,
  onEdit,
  onDelete
}: AppointmentListProps) {
  const formatCustomerName = (appointment: AppointmentWithRelations) => {
    if (!appointment.customer) return 'Unknown Customer'
    const firstName = appointment.customer.firstName || ''
    const lastName = appointment.customer.lastName || ''
    return `${firstName} ${lastName}`.trim() || 'Unknown Customer'
  }

  const formatPetName = (appointment: AppointmentWithRelations) => {
    if (!appointment.pet) return 'Unknown Pet'
    return appointment.pet.name || 'Unknown Pet'
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Pet</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment.id}>
              <TableCell>
                {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                {format(new Date(`2000-01-01T${appointment.appointment_time}`), 'h:mm a')}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{formatCustomerName(appointment)}</span>
                  {appointment.customer?.email && (
                    <span className="text-sm text-muted-foreground">{appointment.customer.email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="flex items-center gap-2">
                {appointment.pet?.image_url ? (
                  <Image
                    src={appointment.pet.image_url}
                    alt={appointment.pet.name || 'Pet image'}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <PawPrint className="h-6 w-6 text-primary/60" />
                  </div>
                )}
                <span>{formatPetName(appointment)}</span>
              </TableCell>
              <TableCell>
                {Array.isArray(appointment.service_items) 
                  ? appointment.service_items.join(', ')
                  : 'No services listed'}
              </TableCell>
              <TableCell>{appointment.employee_name || 'Unassigned'}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                  {appointment.status || 'pending'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(appointment)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(appointment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}) 