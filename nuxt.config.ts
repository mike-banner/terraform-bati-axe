import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
    preset: 'cloudflare-pages'
  },

  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui'
  },

  future: {
    compatibilityVersion: 4
  }
})
