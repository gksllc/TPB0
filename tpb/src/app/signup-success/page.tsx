import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupSuccessPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email || ''
  const encodedEmail = encodeURIComponent(email)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Created Successfully!</CardTitle>
        <CardDescription>
          Please check your email to verify your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you an email with a verification link. Please click the link to activate your account.
        </p>
        <p className="text-sm text-muted-foreground">
          If you don&apos;t see the email, please check your spam folder.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Link href={`/auth?tab=signin&email=${encodedEmail}`} className="w-full">
          <Button className="w-full">
            Return to Login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
} 