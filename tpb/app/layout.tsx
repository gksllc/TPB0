import React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Pet Boutique",
  description: "Pet grooming and boutique services",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={inter.className}>
        <Toaster position="top-right" />
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
} 