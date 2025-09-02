import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oh Deer Coins - Official LiveMe Reseller',
  description: 'Buy LiveMe Coins & Nobility Points in seconds. Fast, safe, and official reseller with 24/7 fulfillment.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}