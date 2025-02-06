/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  typescript: {
    // Temporarily disable TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily disable ESLint errors during build
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
