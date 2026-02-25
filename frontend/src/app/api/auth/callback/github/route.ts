import { NextRequest, NextResponse } from 'next/server'

/**
 * GitHub OAuth Callback Handler
 * 
 * This route receives the OAuth callback from GitHub and forwards it to the backend.
 * The backend processes the OAuth code and redirects back to the frontend with a token.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // If there's an error from GitHub, redirect to frontend error page
  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/callback?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/auth/callback?error=missing_code_or_state', request.url)
    )
  }

  try {
    // Forward the OAuth callback to the backend
    // NEXT_PUBLIC_API_URL includes /api suffix (e.g. https://docuverse-main.onrender.com/api)
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    const callbackUrl = `${apiBaseUrl}/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
    
    const backendResponse = await fetch(callbackUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'manual', // Don't follow redirects automatically - we'll handle it
    })

    // Backend returns a 307 redirect to frontend with token
    if (backendResponse.status === 307 || backendResponse.status === 302) {
      const redirectUrl = backendResponse.headers.get('location')
      if (redirectUrl) {
        // Backend redirects to: http://localhost:3000/auth/callback?token=...
        // Extract the token from the redirect URL
        try {
          const redirectUrlObj = new URL(redirectUrl)
          const token = redirectUrlObj.searchParams.get('token')
          
          if (token) {
            // Redirect to our frontend callback page with the token
            const frontendCallbackUrl = new URL('/auth/callback', request.url)
            frontendCallbackUrl.searchParams.set('token', token)
            return NextResponse.redirect(frontendCallbackUrl)
          }
        } catch (urlError) {
          // If URL parsing fails, try to extract token from the redirect URL string
          const tokenMatch = redirectUrl.match(/[?&]token=([^&]+)/)
          if (tokenMatch) {
            const frontendCallbackUrl = new URL('/auth/callback', request.url)
            frontendCallbackUrl.searchParams.set('token', tokenMatch[1])
            return NextResponse.redirect(frontendCallbackUrl)
          }
        }
      }
    }

    // If we get here, something went wrong
    console.error('Unexpected backend response:', backendResponse.status, await backendResponse.text())
    return NextResponse.redirect(
      new URL('/auth/callback?error=unexpected_response', request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/auth/callback?error=${encodeURIComponent('Failed to process OAuth callback')}`,
        request.url
      )
    )
  }
}

