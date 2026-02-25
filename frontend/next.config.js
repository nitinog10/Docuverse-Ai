/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_API_URL should include /api (e.g. https://docuverse-main.onrender.com/api)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
// Strip trailing /api for the rewrite base
const backendBase = apiUrl.replace(/\/api\/?$/, '')

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig

