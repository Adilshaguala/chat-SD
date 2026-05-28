const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

const allowedOrigins = [
  "159.89.236.105",
  "159.89.236.105:9000",
]

if (siteUrl) {
  try {
    const { host, hostname } = new URL(siteUrl)
    allowedOrigins.push(host, hostname)
  } catch {
    // Ignore invalid NEXT_PUBLIC_SITE_URL format
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: Array.from(new Set(allowedOrigins)),
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
