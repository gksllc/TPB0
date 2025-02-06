import './globals.css'
import { Metadata } from 'next'
import React from 'react'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'The Pet Bodega',
  description: 'Management system for The Pet Bodega',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-full bg-background text-foreground`}>
        <Toaster position="top-right" />
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
} 