import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupSuccessPage({
  searchParams,
}: {
  searchParams: { email: string }
}) {
  return (
    <div className="min-h-screen bg-[#1a2237] flex items-center justify-center p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We've sent a confirmation email to{" "}
            <span className="font-medium text-foreground">
              {searchParams.email}
            </span>
            . Please check your email and click the confirmation link to complete
            your registration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 