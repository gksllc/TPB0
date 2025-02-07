import { Metadata } from "next"
import { ClientDashboardPage } from "@/components/client-dashboard-page"

export const metadata: Metadata = {
  title: "Dashboard - The Pet Bodega",
  description: "Manage your pet grooming appointments at The Pet Bodega.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <ClientDashboardPage />
} 