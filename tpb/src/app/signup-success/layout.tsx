import React from 'react'

export default function SignupSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6">
        {children}
      </div>
    </main>
  )
} 