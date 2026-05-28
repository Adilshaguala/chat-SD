/** @type {import('next').NextConfig} */
const nextConfig = {
  server:{
    port: 3001,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
