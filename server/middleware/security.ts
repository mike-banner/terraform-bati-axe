export default defineEventHandler((event) => {
  const res = event.node.res

  // CSP: Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss: http://127.0.0.1:54321 http://localhost:54321 https://*.supabase.co https://*.supabase.in https://*.r2.cloudflarestorage.com; frame-src 'self' https://challenges.cloudflare.com; object-src 'none';"
  )

  // Standard Security Headers
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // HSTS (Strict-Transport-Security) only in production/staging
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
})
