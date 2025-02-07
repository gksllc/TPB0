import { EmployeeLayout } from "@/components/employee-layout"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EmployeeLayout>{children}</EmployeeLayout>
} 