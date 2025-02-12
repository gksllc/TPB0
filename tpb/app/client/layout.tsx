import { ClientLayout as Layout } from "@/components/client-layout"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Layout>{children}</Layout>
} 