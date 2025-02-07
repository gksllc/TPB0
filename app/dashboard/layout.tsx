import { DashboardNav } from "@/components/dashboard-nav"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard - The Pet Bodega",
  description: "Admin dashboard for The Pet Bodega.",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        {children}
      </main>
    </div>
  )
} 