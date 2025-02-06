/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['ufeqqnxdykarmbpvjnsz.supabase.co'],
  },
}

module.exports = nextConfig 