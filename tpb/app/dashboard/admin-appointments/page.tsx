import { Metadata } from "next"
import { AdminAppointmentsPage } from "@/components/admin-appointments-page"

export const metadata: Metadata = {
  title: "Admin Appointments - The Pet Bodega",
  description: "Manage appointments at The Pet Bodega.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <AdminAppointmentsPage />
} 