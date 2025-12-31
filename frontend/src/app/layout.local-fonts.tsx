/**
 * Alternative layout using only system fonts (no Google Fonts)
 * Use this if you're experiencing network issues with Google Fonts
 * 
 * To use: Rename this file to layout.tsx (backup the original first)
 */

import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'DocuVerse - Generative Media Documentation Engine',
  description: 'Transform complex codebases into interactive, audio-visual walkthroughs',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-dv-bg text-dv-text antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

