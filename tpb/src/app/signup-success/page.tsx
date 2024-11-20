"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupSuccessPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-[#1a2237] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="rounded-full overflow-hidden bg-white w-12 h-12 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="The Pet Bodega logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">The Pet Bodega</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Created Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We've sent a verification email to:
            </p>
            <p className="font-medium">{email}</p>
            <p className="text-muted-foreground">
              Please check your email and click the verification link to activate your account.
              You won't be able to sign in until your email is verified.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/auth" className="w-full">
              <Button className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 