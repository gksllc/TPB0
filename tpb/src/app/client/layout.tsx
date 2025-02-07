import { ClientLayout } from "@/components/client-layout"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
} 