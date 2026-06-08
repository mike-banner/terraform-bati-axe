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
        compatibilityFlags: ['nodejs_compat'],
        compatibilityDate: '2024-09-23'
      }
    }
  },

  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  },

  runtimeConfig: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePriceId: process.env.STRIPE_PRICE_ID,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    }
  },

  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
          "connect-src 'self' ws: wss: http://127.0.0.1:54321 http://localhost:54321 https://*.supabase.co https://*.supabase.in https://*.r2.cloudflarestorage.com",
          "img-src 'self' data: blob:",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "frame-src https://challenges.cloudflare.com",
          "worker-src blob: 'self'",
        ].join('; ')
      }
    }
  },

  future: {
    compatibilityVersion: 4
  }
})
