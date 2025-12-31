import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Configure fonts with fallbacks and display swap to prevent blocking
const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  fallback: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
})

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body 
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans bg-dv-bg text-dv-text antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

