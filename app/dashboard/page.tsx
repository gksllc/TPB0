import { DashboardPage } from "@/components/dashboard-page"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard - The Pet Bodega",
  description: "Admin dashboard for The Pet Bodega.",
}

export const dynamic = 'force-dynamic'

export default function Page() {
  return <DashboardPage />
} 