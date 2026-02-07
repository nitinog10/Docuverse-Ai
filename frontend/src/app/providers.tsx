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
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #3f3f46',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#18181b',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#18181b',
              },
            },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  )
}

