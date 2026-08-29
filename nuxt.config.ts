import { fileURLToPath } from 'node:url'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/tailwind.css'],

  modules: [
    'shadcn-nuxt',
    '@nuxtjs/supabase'
  ],

  vite: {
    plugins: [
      tailwindcss()
    ]
  },

  nitro: {
    preset: 'cloudflare-pages',
    alias: {
      '#supabase/server': path.resolve(__dirname, 'node_modules/@nuxtjs/supabase/dist/runtime/server/services')
    },
    cloudflare: {
      pages: {
        // @ts-expect-error nitropack types lag behind Cloudflare Pages API
        compatibilityFlags: ['nodejs_compat'],
        compatibilityDate: '2024-09-23'
      }
    }
  },

  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || '',
    secretKey: process.env.NUXT_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    serviceKey: process.env.NUXT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  },

  runtimeConfig: {
    stripeSecretKey: process.env.NUXT_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY,
    stripePriceId: process.env.NUXT_STRIPE_PRICE_ID || process.env.STRIPE_PRICE_ID,
    stripeWebhookSecret: process.env.NUXT_STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
    r2AccountId: process.env.NUXT_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID,
    r2AccessKeyId: process.env.NUXT_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.NUXT_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY,
    r2BucketName: process.env.NUXT_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'batiaxe-documents',
    // 05.14 — Multi-Buckets R2 (isolation Public / Vault / B2B)
    r2BucketPublic: process.env.NUXT_R2_BUCKET_PUBLIC || process.env.R2_BUCKET_PUBLIC || '',
    r2BucketVault: process.env.NUXT_R2_BUCKET_VAULT || process.env.R2_BUCKET_VAULT || '',
    r2BucketB2b: process.env.NUXT_R2_BUCKET_B2B || process.env.R2_BUCKET_B2B || '',
    resendApiKey: process.env.NUXT_RESEND_API_KEY || process.env.RESEND_API_KEY,
    // Expéditeur Resend. Tant que le domaine n'est pas vérifié, garder le sender
    // partagé 'onboarding@resend.dev' (ne livre qu'à l'adresse du compte Resend).
    // Override prod via NUXT_EMAIL_FROM une fois bati-axe.fr vérifié.
    emailFrom: process.env.NUXT_EMAIL_FROM || process.env.EMAIL_FROM || 'BÂTI-AXE <contact@bati-axe.com>',
    // Email d'onboarding pro (REQ-07) — off par défaut.
    onboardingEmails: (process.env.NUXT_ONBOARDING_EMAILS || process.env.ONBOARDING_EMAILS) === 'true',
    // 05.15 — Adresse recevant les alertes admin (ex. SIRET non trouvé/en erreur au claim).
    adminEmail: process.env.NUXT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '',
    // P2 — Cloudflare Turnstile (anti-spam). Clé secrète côté serveur uniquement.
    turnstileSecretKey: process.env.NUXT_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      // P2 — clé publique Turnstile (rendue côté client).
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com",
          "connect-src 'self' ws: wss: http://127.0.0.1:54321 http://localhost:54321 https://*.supabase.co https://*.supabase.in https://*.r2.cloudflarestorage.com",
          "img-src 'self' data: blob:",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "frame-src https://challenges.cloudflare.com",
          "worker-src 'self' blob:",
          "child-src 'self' blob:"
        ].join('; ')
      }
    }
  },

  future: {
    compatibilityVersion: 4
  }
})
