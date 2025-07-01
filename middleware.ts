import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/landing',
  '/pricing',
  '/health',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
])

// Define API routes
const isApiRoute = createRouteMatcher(['/api(.*)'])

export default clerkMiddleware((auth, req) => {
  const { userId } = auth()
  
  // Allow access to public routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Handle API routes
  if (isApiRoute(req)) {
    // For API routes, we'll handle auth in individual endpoints
    return NextResponse.next()
  }

  // Protect all other routes
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 