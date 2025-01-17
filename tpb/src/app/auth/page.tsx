import { AuthPage } from "@/components/auth-page"

export default function Auth({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const defaultTab = searchParams.tab === 'signup' ? 'signup' : 'signin'
  const email = searchParams.email ? decodeURIComponent(String(searchParams.email)) : ''
  
  return <AuthPage defaultTab={defaultTab} defaultEmail={email} />
} 