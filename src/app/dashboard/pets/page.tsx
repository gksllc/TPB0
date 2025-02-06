'use client'

import dynamicImport from 'next/dynamic'
import { Suspense } from 'react'

// Route configuration
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import PetsPage with no SSR
const PetsPage = dynamicImport(
  () => import('@/components/pets-page').then(mod => ({ default: mod.PetsPage })),
  { ssr: false }
)

export default function Pets() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PetsPage />
    </Suspense>
  )
} 