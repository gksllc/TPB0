import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your account and settings",
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout 