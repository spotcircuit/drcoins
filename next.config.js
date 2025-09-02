/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-cdn.com', 'images.unsplash.com'], // Add your image domains here
  },
}

module.exports = nextConfig