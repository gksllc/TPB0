import { CustomersPage } from "@/components/customers-page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Page() {
  return <CustomersPage />
} 