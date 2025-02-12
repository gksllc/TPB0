import { Metadata } from "next"
import { AuthPage } from "@/components/auth-page"

export const metadata: Metadata = {
  title: "Sign In - The Pet Bodega",
  description: "Sign in to your Pet Bodega account to manage your pet grooming appointments.",
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function LoginPage() {
  return <AuthPage />
} 