import { SettingsPage } from "@/components/settings-page"

export const dynamic = 'force-dynamic'
export const revalidate = 0 as const

export default function Page() {
  return <SettingsPage />
} 