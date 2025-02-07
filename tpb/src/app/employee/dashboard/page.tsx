import { Metadata } from "next"
import { EmployeeDashboardPage } from "@/components/employee-dashboard-page"

export const metadata: Metadata = {
  title: "Dashboard - The Pet Bodega",
  description: "Employee dashboard for The Pet Bodega.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <EmployeeDashboardPage />
} 