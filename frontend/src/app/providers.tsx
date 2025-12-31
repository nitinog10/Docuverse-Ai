'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useHydration } from '@/lib/store'

function StoreHydration() {
  useHydration()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <StoreHydration />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161b22',
              color: '#c9d1d9',
              border: '1px solid #30363d',
            },
            success: {
              iconTheme: {
                primary: '#3fb950',
                secondary: '#161b22',
              },
            },
            error: {
              iconTheme: {
                primary: '#f85149',
                secondary: '#161b22',
              },
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  )
}

