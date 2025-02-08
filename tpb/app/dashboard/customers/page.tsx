import { Metadata } from "next"
import { AppCustomersPage } from "@/components/customers-page"

export const metadata: Metadata = {
  title: "Customers - The Pet Bodega",
  description: "Manage customers at The Pet Bodega.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <AppCustomersPage />
} 