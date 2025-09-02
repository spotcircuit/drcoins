/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    domains: ['your-cdn.com', 'images.unsplash.com'], // Add your image domains here
  },
}

module.exports = nextConfig