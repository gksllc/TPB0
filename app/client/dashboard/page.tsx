import { Metadata } from "next"
import { ClientDashboardPage } from "@/components/client-dashboard-page"

export const metadata: Metadata = {
  title: "Dashboard - The Pet Bodega",
  description: "Client dashboard for The Pet Bodega.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <ClientDashboardPage />
} 